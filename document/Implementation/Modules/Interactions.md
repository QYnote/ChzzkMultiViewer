[설계서](../../../README.md) › [구현](../README.md) › [모듈](README.md) › 조작 흐름

# 사용자 조작 흐름

> **다루는 내용:** 사용자가 조작했을 때 모듈들이 주고받는 순서
> **갱신 트리거:** 조작에 따라 모듈 사이에 오가는 순서가 바뀔 때

## 본문

### 1. 채널 추가

```mermaid
sequenceDiagram
  actor U as 사용자
  participant P as Popup
  participant S as 브라우저 저장소

  U->>P: 채널 ID·이름 입력 후 추가
  P->>P: 입력 형식 검사
  P->>S: 시청 목록 읽기
  alt 이미 있는 채널
    P-->>U: 추가하지 않고 알림
  else 새 채널
    P->>S: 목록에 더해 저장
    P-->>U: 목록 다시 그리기
  end
```

- 열려 있는 대시보드에는 **알리지 않는다.** 반영은 `멀티뷰 대시보드 열기`를 누를 때 한꺼번에 한다 — [3. 대시보드 열기](#3-대시보드-열기)
- 즐겨찾기에서 옮기기, 팔로잉 목록에서 더하기, 저장한 목록 불러오기, 받은 글로 덮어쓰기도 같다. 저장소에만 쓴다.

### 2. 팔로잉 목록 불러오기

```mermaid
sequenceDiagram
  actor U as 사용자
  participant P as Popup
  participant BG as Background
  participant PF as Platforms
  participant API as 플랫폼 서버

  U->>P: 팔로잉 목록 불러오기
  P->>BG: 팔로잉 목록 조회 요청 (플랫폼 지정)
  BG->>PF: 해당 플랫폼 어댑터 호출
  PF->>API: 조회 (로그인 쿠키가 실려 감)
  API-->>PF: 팔로잉 목록
  PF-->>BG: 결과
  BG-->>P: 응답
  P-->>U: 생방송 먼저 정렬해 표시
```

- 버튼을 보여 줄지 정하는 **로그인 판단**은 플랫폼마다 다르다. 치지직은 팝업이 브라우저 쿠키를 직접 보고, SOOP은 Background에 확인을 맡긴다 — [치지직](../../Requirements/External-Interfaces/Chzzk.md) · [SOOP](../../Requirements/External-Interfaces/Soop.md)
- 조회가 실패하면 실패 안내와 함께 그 플랫폼 홈으로 가는 링크를 보여 준다.

### 3. 대시보드 열기

```mermaid
sequenceDiagram
  actor U as 사용자
  participant P as Popup
  participant D as Dashboard
  participant S as 브라우저 저장소
  participant C as 방송 화면

  U->>P: 멀티뷰 대시보드 열기
  alt 대시보드가 열려 있지 않음
    P->>D: 새 탭 열기
    D->>S: 시청 목록 · 설정 · 배치 읽기
    D->>C: 채널마다 방송 화면 만들기
  else 이미 열려 있음
    P->>D: 그 탭으로 이동, 지금 시청 목록 전달
    alt 담긴 채널이 같음
      D->>D: 아무것도 다시 읽지 않음
    else 하나라도 다름
      D->>S: 다시 읽기
      D->>C: 방송 화면을 모두 새로 만듦
    end
  end
```

- 담긴 채널이 하나라도 다르면 겹치는 채널까지 **모두 다시 읽는다.** 그 순간 보던 방송이 끊긴다.
- 방송 화면 안 스크립트는 브라우저가 붙여 준다. 대시보드가 따로 넣거나 초기화 지시를 보내지 않는다.

### 4. 배치 바꾸기

```mermaid
sequenceDiagram
  actor U as 사용자
  participant D as Dashboard
  participant S as 브라우저 저장소

  U->>D: 경계 끌기 / 손잡이로 자리 옮기기·쪼개기
  D->>D: 배치 트리 다시 계산
  D->>D: 칸 크기·자리 반영
  D->>S: 배치 트리 저장
```

- 방송 화면을 다시 만들지 않는다. 칸의 크기와 위치만 바뀌므로 보던 방송이 끊기지 않는다.
- 저장하는 모양은 [저장 데이터](../../Requirements/Data.md#5-대시보드-배치) 참고.

### 5. 설정 바꾸기

```mermaid
sequenceDiagram
  actor U as 사용자
  participant P as Popup
  participant S as 브라우저 저장소
  participant D as Dashboard

  U->>P: 자동 동기화 · 허용 지연 시간 · 칸 채널 표시 바꾸기
  P->>S: 설정 저장 (바꾸는 즉시)
  S-->>D: 설정이 바뀌었음 (대시보드가 감시)
  D->>D: 자동 동기화 · 표시 방식 바로 적용
```

- 팝업이 대시보드에 알리는 것이 아니다. 대시보드가 저장소의 설정 변경을 스스로 감시한다. 저장 항목 중 대시보드가 감시하는 것은 설정뿐이다.

### 6. 방송 화면 소식과 자동 동기화

사용자가 직접 하는 조작은 아니지만, 대시보드를 보는 동안 계속 돌아가는 흐름이다.

```mermaid
sequenceDiagram
  participant C as 방송 화면
  participant D as Dashboard

  C->>C: 재생 시작
  loop 1초마다
    C->>D: 딜레이
    alt 기준 초과 · 광고 아님 · 방송 중 · 15초 안에 다시 읽은 적 없음
      D->>C: 그 칸만 다시 읽기 (주소 다시 넣기)
    end
  end
  C->>D: 넓은 화면 전환 결과
  C->>D: 광고 시작·끝
```

- 딜레이 소식이 **10초 동안 없으면** 신호가 끊긴 것으로 보고 그 칸을 다시 읽는다. 딜레이는 재생이 시작된 뒤부터 오므로, 열린 뒤 10초 안에 재생이 시작되지 않는 칸도 여기에 걸린다.
- 판정 기준과 예외는 [Dashboard](Dashboard.md#2-자동-동기화) · [ContentScript](ContentScript.md) 참고.
