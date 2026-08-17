[설계서](../../README.md) › [Process-Viewpoint](README.md) › Flows-Lifecycle

# 확장 생명주기 흐름

> **다루는 내용:** 설치부터 종료까지 확장의 상태 전이
> **갱신 트리거:** 생명주기 단계가 추가되거나 상태 전이가 변경될 때

---

## 1. 초기화 단계

확장이 설치되고 처음 활성화될 때:

```mermaid
graph TD
    A["사용자가 Chrome에 설치"] -->|manifest.json 로드| B["Manifest 검증"]
    B --> C["Service Worker 등록"]
    C --> D["권한 요청"]
    D --> E["네트워크 규칙 로드"]
    E --> F["준비 완료"]
    F --> G["사용자 아이콘 클릭 대기"]
    
    style F fill:#4caf50,color:#ffffff
    style G fill:#ffeb3b,color:#333
```

**포인트:**
- ✅ Service Worker는 manifest.json 로드 후 바로 등록
- ✅ 네트워크 규칙(declarativeNetRequest)은 startup 시 한 번만 로드
- ⏳ 이후 아이콘 클릭 대기

---

## 2. 런타임 상태 전이

사용자 조작에 따른 상태 전이:

```mermaid
stateDiagram-v2
    [*] --> Idle: 설치 완료
    
    Idle --> PopupActive: 사용자 아이콘 클릭
    PopupActive --> Idle: 팝업 닫음
    
    PopupActive --> DashboardActive: "대시보드 열기" 클릭
    
    DashboardActive --> DashboardActive: 칸 조작, 설정 변경
    DashboardActive --> PopupActive: 팝업으로 복귀
    DashboardActive --> Idle: 대시보드 탭 닫음
    
    PopupActive --> DashboardActive: "대시보드 열기" 재클릭
    
    note right of PopupActive
        메모리: 팝업 닫으면 즉시 해제
        저장소: 유지됨
    end note
    
    note right of DashboardActive
        메모리: 탭 닫을 때까지 유지
        ContentScript: 각 iframe에서 활동
    end note
```

**포인트:**
- 🔄 **상태:** Idle ↔ PopupActive ↔ DashboardActive
- 💾 **메모리:** 탭은 닫혀도 저장소 데이터는 영구 보존
- 🔌 **ContentScript:** Dashboard 활성 시에만 동작

---

## 3. 팝업 생명주기

사용자가 아이콘을 클릭했을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Chrome
    participant Popup as Popup<br/>페이지
    participant Storage as 브라우저<br/>저장소
    participant Background

    User->>Chrome: 확장 아이콘 클릭
    Chrome->>Popup: popup.html 로드
    Popup->>Storage: 현재 상태 읽기<br/>(시청 목록, 설정)
    Popup->>Popup: JavaScript 실행<br/>UI 렌더링
    Popup-->>User: 팝업 화면 표시
    
    User->>Popup: 팝업에서 작업 수행
    Popup->>Storage: 변경사항 저장
    Note over Popup,Storage: 각 조작마다 즉시 저장
    
    User->>Chrome: 팝업 영역 밖 클릭 또는 Esc
    Chrome->>Popup: 팝업 제거
    Popup-->>Popup: 메모리 즉시 해제
    Note over Popup: 모든 변수, 타이머 정리
```

**포인트:**
- ⚡ **빠른 생성:** Chrome이 popup.html 로드 후 즉시 렌더링
- 💾 **자동 저장:** 팝업은 저장소에만 기록, 메모리에 상태 없음
- 🗑️ **즉시 해제:** 닫히는 순간 메모리에서 완전 제거

---

## 4. 대시보드 생명주기

사용자가 팝업에서 "대시보드 열기"를 눌렀을 때:

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Popup
    participant Chrome
    participant Dashboard as Dashboard<br/>탭
    participant Storage as 브라우저<br/>저장소
    participant ContentScript as ContentScript<br/>(각 iframe)

    User->>Popup: "멀티뷰 대시보드 열기"
    Popup->>Chrome: 대시보드 탭 열기 요청<br/>(또는 기존 탭으로 전환)
    
    alt 새 탭 생성
        Chrome->>Dashboard: dashboard.html 로드
        Dashboard->>Storage: 시청 목록 읽기
        Dashboard->>Dashboard: 채널별 iframe 생성
        Dashboard->>Chrome: 각 iframe에 ContentScript 주입
        
        par 병렬 처리 - 각 채널별
            Dashboard->>ContentScript: 초기화 메시지
            ContentScript->>ContentScript: 해당 방송 페이지 연결
            ContentScript-->>Dashboard: 준비 완료
        end
    else 기존 탭 존재
        Chrome->>Dashboard: 해당 탭으로 포커스 변경
        Dashboard-->>Dashboard: 열려있는 상태 유지
    end
    
    Dashboard-->>User: 멀티뷰 화면 표시
    
    loop 사용자가 대시보드에서 작업하는 동안
        User->>Dashboard: 칸 조작, 설정 변경
        Dashboard->>Storage: 배치, 설정 저장
        Dashboard->>ContentScript: 필요시 명령 전송
    end
    
    User->>Chrome: 대시보드 탭 닫음
    Dashboard-->>Dashboard: 메모리 해제 (저장소 유지)
    ContentScript-->>ContentScript: 활동 종료
```

**포인트:**
- 🚀 **일괄 로드:** 대시보드는 **모든 채널을 한 번에** 로드 (Popup과 다름)
- ♻️ **탭 재사용:** 이미 열려 있으면 새 탭 생성 안 함
- ⏱️ **장시간 유지:** 사용자가 닫을 때까지 메모리에 유지
- 🔌 **ContentScript 함께:** 각 iframe의 ContentScript도 함께 동작

---

## 5. 상태별 리소스 관리

```
┌─────────────────────────────────────────┐
│           Idle 상태                      │
│  • Service Worker만 백그라운드에서 대기  │
│  • 다른 리소스 없음                      │
│  • 저장소만 유지                         │
└─────────────────────────────────────────┘
           ↓ (아이콘 클릭)
┌─────────────────────────────────────────┐
│        PopupActive 상태                  │
│  • Popup 페이지 메모리                   │
│  • Popup HTML/CSS/JS                    │
│  • 저장소 Read/Write 중                  │
│  • Background와 Message 통신             │
└─────────────────────────────────────────┘
           ↓ (대시보드 열기)
┌─────────────────────────────────────────┐
│       DashboardActive 상태               │
│  • Dashboard 탭 메모리                   │
│  • N개 iframe (채널 수만큼)              │
│  • N개 ContentScript (각 iframe)        │
│  • 저장소 Read/Write + 감지              │
│  • Background와 Message 통신             │
│  ├─ Popup도 동시에 열려있을 수 있음     │
│  └─ Popup과 Dashboard는 독립적          │
└─────────────────────────────────────────┘
```

**포인트:**
- 🎯 **상태별 리소스:** 각 상태에서 필요한 리소스만 로드
- 🔄 **상태 전이:** 탭 닫음 = 메모리 해제 (저장소는 유지)
- 📊 **복수 인스턴스 가능:** Popup과 Dashboard 동시 실행 가능 (독립적)

