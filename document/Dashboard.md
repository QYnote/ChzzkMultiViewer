[설계서](../README.md) › [Architecture](Architecture.md) › Dashboard

# Dashboard

> **다루는 내용:** 대시보드의 책임과 계약 (입력/트리거/출력)
> **갱신 트리거:** 책임 범위나 입출력 계약이 바뀔 때

## 본문

**책임**
멀티뷰 화면 자체. 메인/서브 iframe을 생성·배치하고 스왑·자동 동기화·레이아웃·볼륨·채팅을 총괄한다.

**트리거**
- 대시보드 탭 로드 (`DOMContentLoaded`)
- Popup의 `checkReload` 메시지
- ContentScript의 postMessage (딜레이/볼륨/와이드완료/광고)
- `chrome.storage.onChanged` (설정 변경 실시간 반영)
- 사용자 조작 — 서브 타일 클릭(스왑), 드래그(순서 변경/영역 확대), 버튼(삭제/새로고침/접기)

**입력**
- `chrome.storage.local`의 `currentViewList` / `systemSettings` / `dashboardLayout` 등
- Background 응답 — 생방송 상태, 프로필 사진
- ContentScript의 postMessage

**출력**
- Platforms 어댑터로 iframe `src` 생성 (`buildStreamUrl` / `buildChatUrl`)
- ContentScript에 postMessage — 볼륨 지정, 와이드 재시도 요청
- `chrome.storage.local`에 레이아웃/패널 상태 저장
- `chrome.storage.local`의 `currentViewList` 갱신 — 메인↔서브 스왑, 서브 순서 변경, 서브 개별 삭제
- Background에 생방송 상태·프로필 사진 요청

**다른 모듈과의 관계**
- Platforms를 직접 로드한다 (URL 조립만 담당, 네트워크 호출 없음)
- Background에 의존한다 (생방송 상태·프로필 사진)
- ContentScript 인스턴스(iframe)들과 1:N postMessage 관계를 맺는다

⚠️ 메인↔서브 스왑은 iframe을 DOM에서 옮기는 방식(`insertBefore`)이라 재로드가 없다. 이 때문에 볼륨 적용 타이밍이 어긋날 수 있어 스왑 직후·0.5초·1.5초 세 번 나눠 재전송한다.
⚠️ "초기화 진행중" 안내가 떠 있는 동안에는 스왑이 막힌다 (안내 엘리먼트 존재 여부로 판단).
⚠️ 시청 목록을 저장할 때는 항상 **현재 화면 상태**(메인 + 서브 타일 순서)를 기준으로 쓴다. 저장소의 0번을 메인으로 재사용하면, 스왑 직후에는 그 값이 이미 옛 메인이라 목록이 깨진다.
