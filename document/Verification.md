[설계서](../README.md) › 검증

# 검증

> **다루는 내용:** 무엇을 확인해야 완성으로 치는가 — 요구사항 요소별 확인 범위와 합격 기준
> **갱신 트리거:** 요구사항 요소가 추가·제거되거나 합격 기준이 바뀔 때

## 본문

### 합격 기준

배포하기 전에 아래 둘을 모두 통과해야 한다.

1. 이번에 바뀐 요소의 **기대 동작 표 전 항목**
2. 바뀐 것과 상관없이 [기본 확인](#기본-확인) 전 항목

확인하는 사람은 개발자 본인이고, 실제 브라우저에 실제 방송을 띄워 눈으로 확인한다. 자동 검사는 두지 않는다.[^1]

### 요소별 확인 범위

요구사항 요소와 1:1로 대응한다. 기대 동작 표가 있는 요소는 그 표가 곧 확인 항목이다.

| 요구사항 요소 | 확인할 것 |
|---|---|
| [볼 채널 정하기](Requirements/Functions/Channel-Selection.md) | 직접 추가 · 팔로잉에서 추가 · 시청 목록 다루기 · 대시보드에 반영 — 각 기대 동작 표 |
| [채널 모아 두기](Requirements/Functions/Favorites.md) | 기대 동작 표 |
| [조합 보관·주고받기](Requirements/Functions/Saved-Lists.md) | 저장된 목록 · 공유 글 — 각 기대 동작 표 |
| [방송 칸 띄우기](Requirements/Functions/Multiview/Stream-Cell.md) | 로그인 상태 · 끼워 넣기 제한 대응 · 좁은 칸 축소 · 방송 꺼짐 표시 — 각 기대 동작 표 |
| [칸 배치](Requirements/Functions/Multiview/Layout.md) | 처음 배치 · 배치 바꾸기 · 배치 기억 — 각 표 |
| [칸 조작](Requirements/Functions/Multiview/Cell-Controls.md) | 조작 줄 · 소리 · 채널 표시 — 각 기대 동작 표 |
| [자동 처리](Requirements/Functions/Multiview/Automation.md) | 넓은 화면 · 광고 · 자동 동기화 · 안내 · SOOP 전용 — 각 표 |
| [설정](Requirements/Functions/Settings.md) | 기대 동작 표 |
| [사용자 화면](Requirements/External-Interfaces/User-Interface.md) | 팝업·대시보드에 기능이 적힌 자리에 있는가, 알림이 적힌 대로 뜨는가 |
| [치지직](Requirements/External-Interfaces/Chzzk.md) · [SOOP](Requirements/External-Interfaces/Soop.md) | 문서에 적힌 값이 지금도 맞는가. 기능이 멈췄을 때 여기부터 대조한다 |
| [데이터](Requirements/Data.md) | 데이터끼리의 관계 표, 예전 값 변환 |
| [제약](Requirements/Constraints.md) | 받는 권한이 표와 같은가. **권한이 바뀌면 배포 전에 반드시 드러낸다** |
| [품질 속성](Requirements/Quality-Attributes.md) | 끊기지 않음 · 보안 · 데이터 보호 · 호환 — 각 표 |

### 기본 확인

바뀐 것이 없어도 배포 때마다 확인한다. 한 번에 훑을 수 있는 최소 범위다.

| # | 할 일 | 합격 |
|---|---|---|
| 1 | 확장을 새로고침하고 팝업을 연다 | 시청 목록·즐겨찾기·저장 목록이 그대로 보인다 |
| 2 | 치지직 채널 하나, SOOP 채널 하나를 시청 목록에 넣고 대시보드를 연다 | 두 칸 모두 방송이 뜬다. 로그인돼 있으면 로그인된 화면이다 |
| 3 | 칸 경계를 끌고, 두 칸의 자리를 바꾼다 | 방송이 끊기지 않는다 |
| 4 | 대시보드를 닫았다 다시 연다 | 바꾼 배치가 그대로다 |
| 5 | 잠시 지켜본다 | 넓은 화면으로 바뀌고, 열자마자 칸이 다시 읽히지 않는다 |
| 6 | 팝업에서 채널 하나를 빼고 대시보드 열기를 누른다 | 그 칸이 사라지고 옆 칸이 자리를 채운다 |
| 7 | 이전 배포와 받는 권한을 비교한다 | 같다. 다르면 배포 보고에 드러낸다 |

[^1]: 방송 페이지와 플랫폼 로그인을 그대로 써야 해서 자동으로 흉내 내기 어렵다. 확인 순서와 진단에 쓰는 방법은 [빌드·배포](Implementation/Build-Deploy.md#확인과-진단) 참고.
