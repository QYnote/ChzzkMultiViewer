[설계서](../../README.md) › [Process-Viewpoint](README.md) › Flows-UserInteractions

# 사용자 상호작용 흐름

> **다루는 내용:** 사용자가 UI와 상호작용할 때의 메시지 시퀀스
> **갱신 트리거:** 사용자 조작에 따른 메시지 흐름이 변경될 때

---

## 1. 채널 추가 흐름

사용자가 팝업에서 채널을 추가할 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup
    participant Storage as 브라우저 저장소
    participant Dashboard

    User->>Popup: "채널 추가" 버튼 클릭
    Popup->>Popup: 입력값 검증
    Popup->>Storage: 현재 시청 목록 읽기
    Popup->>Storage: 새 채널 추가 후 저장
    Popup->>Dashboard: 채널 변경 알림 (존재하면)
    Note over Popup,Dashboard: ⚠️ Dashboard는 즉시 반영 안 함<br/>다음 "대시보드 열기"에서 반영
```

**포인트:**
- ✅ Popup에서 즉시 저장소에 기록
- ✅ Dashboard에 알림만 전송 (UI 변경은 안 함)
- ✅ `멀티뷰 대시보드 열기` 시점에 최종 반영

---

## 2. 팔로잉 목록 조회 흐름

사용자가 팝업에서 "팔로잉 불러오기" 버튼을 눌렀을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup
    participant Background
    participant Platforms
    participant API as Chzzk/SOOP API

    User->>Popup: "팔로잉 불러오기" 클릭
    Popup->>Background: 팔로잉 목록 조회 요청
    Background->>Background: 쿠키 읽기
    Background->>Platforms: 플랫폼 선택 및 호출
    Platforms->>API: API 요청 (쿠키 포함)
    API-->>Platforms: 팔로잉 목록 응답
    Platforms-->>Background: 파싱된 목록 반환
    Background-->>Popup: 메시지 응답
    Popup->>Popup: 목록 UI 렌더링
    Popup-->>User: 팔로잉 목록 표시
```

**포인트:**
- 🔒 **권한 분리:** Popup은 쿠키/네트워크 접근 불가 → Background 요청 필수
- 🔄 **플랫폼 추상화:** Platforms가 Chzzk/SOOP 차이 흡수
- 📨 **비동기 통신:** 메시지 기반 request-response 패턴

---

## 3. 화면 조작 흐름 (음량 제어)

사용자가 대시보드에서 음량을 조절했을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Dashboard
    participant ContentScript as ContentScript<br/>(iframe 안)
    participant BroadcastPage as 방송 페이지<br/>(chzzk.naver.com)

    User->>Dashboard: 음량 슬라이더 조작
    Dashboard->>Dashboard: 슬라이더 값 계산
    Dashboard->>ContentScript: 음량 변경 명령 (값: 0~100)
    
    ContentScript->>BroadcastPage: 페이지의 음량 슬라이더 조작
    Note over ContentScript,BroadcastPage: DOM 직접 조작<br/>audio 요소 volumechange 트리거
    
    BroadcastPage-->>ContentScript: 변경 완료
    ContentScript-->>Dashboard: 상태 보고 (실제 음량값)
    Dashboard->>Dashboard: UI 동기화
```

**포인트:**
- 🚫 **제약:** Dashboard는 **iframe 내부에 직접 접근 불가** (CORS)
- 🔗 **중계:** ContentScript가 유일한 접근 통로
- ↔️ **양방향:** Dashboard → ContentScript → 화면 조작 → 상태 보고

---

## 4. 배치 저장 흐름

사용자가 대시보드에서 칸을 이동/리사이징했을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Dashboard
    participant Storage as 브라우저 저장소

    User->>Dashboard: 칸 드래그 / 리사이징
    Dashboard->>Dashboard: 새 배치 계산<br/>(위치, 크기)
    Dashboard->>Storage: 채널별 배치 저장<br/>{ channelId: {x, y, w, h} }
    Note over Dashboard,Storage: ⚠️ 채널 목록 순서는<br/>저장하지 않음

    alt 다른 탭에서 열려 있음
        Storage-->>Dashboard: 저장소 변경 감지
        Dashboard->>Dashboard: 다른 탭에 알림
    else 단일 탭만 열려 있음
        Note over Dashboard: 알림 불필요
    end
```

**포인트:**
- 📍 **채널별 독립 저장:** 각 채널이 **자신의 위치를 기억**
- 🔄 **순서 무관:** 팝업에서 목록 순서를 바꿔도 배치는 유지
- 🔔 **실시간 동기화:** 저장소 감지로 다른 탭에 반영

---

## 5. 설정 변경 흐름

사용자가 팝업에서 "자동 새로고침" 설정을 켰을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup
    participant Storage as 브라우저 저장소
    participant Dashboard
    participant ContentScript as ContentScript<br/>(각 iframe)

    User->>Popup: "자동 새로고침" 체크박스 토글
    Popup->>Storage: 설정값 저장<br/>{ autoRefresh: true }
    Note over Popup,Storage: 영구 저장

    Popup->>Dashboard: 설정 변경 알림 (존재하면)
    
    Dashboard->>Storage: 설정값 감지
    Dashboard->>ContentScript: 각 iframe에<br/>새로고침 로직 지시

    loop 각 iframe에서 실행
        ContentScript->>ContentScript: 새로고침 타이머 시작
        Note over ContentScript: 예: 30초 마다 새로고침
    end

    alt 사용자가 다시 토글 (끔)
        User->>Popup: "자동 새로고침" 체크 해제
        Popup->>Storage: { autoRefresh: false }
        Popup->>Dashboard: 설정 변경 알림
        Dashboard->>ContentScript: 타이머 중지
        ContentScript->>ContentScript: 새로고침 로직 정지
    end
```

**포인트:**
- ⚙️ **영구 저장:** 설정은 저장소에 기록되어 다음 실행에서 복원
- 🔄 **실시간 반영:** Popup 변경 → Dashboard 감지 → ContentScript 실행
- 🎯 **각 iframe 독립:** 각 채널이 설정을 독립적으로 실행
