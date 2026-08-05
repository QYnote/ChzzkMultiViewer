[설계서](../README.md) › [Overview](Overview.md) › Flows

# Flows

> **다루는 내용:** 주요 동작 흐름 (스트리머 추가 → 시청 시작, 메인↔서브 스왑, 자동 동기화 등)
> **갱신 트리거:** 흐름의 단계나 순서가 바뀔 때

## 본문

### 스트리머 추가 → 시청 시작

```mermaid
sequenceDiagram
  participant U as 사용자
  participant P as Popup
  participant BG as Background
  participant S as chrome.storage.local
  participant D as Dashboard

  U->>P: 팔로잉 불러오기 또는 직접 추가
  P->>BG: fetchFollowingList (팔로잉인 경우)
  BG-->>P: 팔로잉 목록 응답
  U->>P: 항목 선택 → 시청 목록에 추가
  P->>S: currentViewList 갱신
  U->>P: 멀티뷰 대시보드 열기
  alt 대시보드 미실행
    P->>D: 새 탭 생성
    D->>S: currentViewList 로드 → 메인/서브 렌더링
  else 대시보드 실행 중
    P->>D: checkReload 메시지
    D->>S: currentViewList 재로드 → 변경분만 반영
  end
```

### 메인 ↔ 서브 스왑

```mermaid
sequenceDiagram
  participant U as 사용자
  participant D as Dashboard
  participant CSsub as ContentScript(서브였던 iframe)
  participant CSmain as ContentScript(메인이었던 iframe)

  U->>D: 서브 타일 클릭
  D->>D: DOM에서 두 iframe 위치만 교환 (재로드 없음)
  D->>CSsub: postMessage chzzk-mv-retrigger-wide
  D->>CSmain: postMessage chzzk-mv-retrigger-wide
  D->>CSsub: postMessage chzzk-mv-audio (기존 메인 볼륨, 0.5s·1.5s 후 재전송)
  D->>CSmain: postMessage chzzk-mv-audio volume 0
  CSsub-->>D: chzzk-mv-wide-done
  CSmain-->>D: chzzk-mv-wide-done
```

⚠️ 스왑은 재로드 없이 DOM 위치만 바꾸는 방식이라, 와이드 화면 상태가 풀릴 수 있어 양쪽 모두 와이드 재시도를 요청한다.

### 초기화 안내 상태 전이

```mermaid
stateDiagram-v2
  [*] --> 초기화진행중: 최초 로드 · 새로고침 · 스왑
  초기화진행중 --> 사라짐: 와이드 전환 성공(wide-done success)
  초기화진행중 --> 수동최대화안내: 1분 내 전환 안 됨
  초기화진행중 --> 사라짐: 비방송 확인됨
  초기화진행중 --> 사라짐: 65초 경과 (안전장치)
  수동최대화안내 --> 사라짐: 사용자가 안내 클릭 또는 새로고침 버튼
```

⚠️ "초기화 진행중" 상태인 동안에는 메인↔서브 스왑이 동작하지 않는다.

### 자동 동기화 / 비방송 확인 (반복 주기)

- 딜레이 측정: Content Script가 1초마다 딜레이를 Dashboard로 보고 → 기준치 초과 시 새로고침(쿨다운 15초)
- 무신호 감지: Dashboard가 5초마다 확인, 마지막 신호로부터 10초 이상 지나면 해당 화면만 새로고침
- 비방송 재확인: Dashboard가 1분마다 Background에 생방송 상태를 물어 화면별로 "방송중이 아닙니다" 표시/해제

⚠️ 위 새로고침 판정에서 **광고 재생 중인 화면과 비방송 상태인 화면은 제외**된다. 광고 중에는 무신호 판정의 기준 시각을 계속 현재로 갱신해, 광고가 끝날 때까지 무신호로 간주하지 않는다.
