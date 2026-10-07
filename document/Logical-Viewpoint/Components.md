[설계서](../../README.md) › [Logical-Viewpoint](README.md) › Components

# Components

> **다루는 내용:** 모듈별 책임·계약 문서의 목록
> **갱신 트리거:** 모듈 문서가 추가·제거될 때

## 본문

| 문서 | 다루는 내용 |
|---|---|
| [Background](Components/Background.md) | 로그인 쿠키 싣기 · 끼워 넣기 제한 해제 · 외부 조회 대리 — 책임과 입출력 |
| [Popup](Components/Popup.md) | 시청 목록 · 즐겨찾기 · 저장된 목록 · 설정 관리, 대시보드 열기 — 책임과 입출력 |
| [Dashboard](Components/Dashboard.md) | 방송 칸 조립 · 배치 · 자동 동기화 — 책임과 입출력 |
| [ContentScript](Components/ContentScript.md) | 방송 화면 안에서 하는 일 — 책임과 입출력 |
| [Platforms](Platforms.md) | 치지직·SOOP 차이를 감싸는 어댑터 — 책임과 입출력 |

- 모듈이 왜 이렇게 나뉘는지, 서로 어느 방향으로 기대는지는 [Architecture](Architecture.md)에 있다.
- 각 모듈이 언제 생기고 사라지는지는 [생명주기](../Process-Viewpoint/Flows-Lifecycle.md)에 있다.
