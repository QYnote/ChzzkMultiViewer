[설계서](../README.md) › [Architecture](Architecture.md) › ContentScript

# ContentScript

> **다루는 내용:** 콘텐츠 스크립트의 책임과 계약 (입력/트리거/출력)
> **갱신 트리거:** 책임 범위나 입출력 계약이 바뀔 때

## 본문

**책임**
Dashboard가 생성한 iframe 안, 치지직/SOOP 방송 페이지에 주입되어 볼륨 제어·딜레이 측정·와이드 화면 자동 전환·채팅창 접기·광고 스킵을 수행한다. SOOP 페이지에서는 고화질 스트리머 연결 안내 팝업 자동 닫기도 함께 처리한다.

**트리거**
- 확장 프로그램이 생성한 iframe에서만 동작 (URL 파라미터 `mv_ext` 존재 여부로 판별, 없으면 즉시 종료)
- `video` 태그 등장/재생 (MutationObserver + `playing` 이벤트)
- Dashboard로부터 오는 postMessage
- 탭 가시성 복귀 (`visibilitychange`)

**입력**
- postMessage: `{ type: 'chzzk-mv-audio', volume, muted, lock }`, `{ type: 'chzzk-mv-retrigger-wide' }`
  - `volume`(0~1)·`muted`·`lock`은 각각 독립이다. `lock`은 방송 페이지가 스스로 음소거를 푸는 것을 막는 잠금으로 **서브 화면에만** 건다. 볼륨 0과 잠금을 분리해야 메인 볼륨이 0이어도 사용자가 직접 풀 수 있다
  - ⚠️ `volume`은 **꼭 필요할 때만 보낸다.** 볼륨 수치를 덮어쓰면 방송 페이지가 그 값을 채널별 상태로 저장해, 다시 로드될 때 페이지가 보여주는 상태와 실제 소리가 어긋난다. 음소거만 시킬 때는 `volume` 없이 `muted`만 보낸다
- URL 쿼리: `mv_ext`, `mute`

**출력** (부모 프레임으로 postMessage)
- `chzzk-mv-ready` — 영상을 처음 확보한 시점. 문서가 다시 로드되면 다시 나간다
- `chzzk-mv-latency` — 초 단위 딜레이, 1초 주기
- `chzzk-mv-vol` — 현재 볼륨과 음소거 여부. 볼륨 변경 시점과 1초 주기 양쪽에서 보낸다 (변경 이벤트만 의존하면 방송 페이지가 저장된 볼륨을 복원하는 시점이 더 빠를 때 값을 놓친다)
- `chzzk-mv-wide-done` — 와이드 전환 성공/실패
- `chzzk-mv-ad` — 광고 재생 여부 변화

**다른 모듈과의 관계**
- Dashboard와만 postMessage로 통신한다. Background·Popup과는 직접 연결이 없다.
- 같은 iframe 안에서 실행되는 ContentScript(MAIN, SOOP 전용)와 역할이 분리되어 있고 서로 메시지를 주고받지 않는다.
  - MAIN 월드 쪽은 SOOP 고화질 플레이어가 로컬 앱 설치 여부를 확인하려고 `127.0.0.1`·`localhost`로 보내는 요청(fetch·XHR·WebSocket)을 모두 실패시킨다. 플레이어가 로컬 앱 미설치로 판단해 HLS 재생으로 자동 폴백하고, 그 결과 브라우저 권한 팝업이 뜨지 않는다. 페이지 자체의 코드를 가로채야 하므로 격리 월드가 아닌 MAIN 월드가 필요하다.

⚠️ 비활성 탭에서는 와이드 전환 단축키 전송이 씹힐 수 있어, 탭으로 돌아왔을 때 와이드 상태가 아니면 재시도한다.
⚠️ 딜레이 값은 영상의 `seekable` 구간 기준이라, 영상이 없거나 아직 로드되지 않은 상태에서는 계산되지 않는다.
