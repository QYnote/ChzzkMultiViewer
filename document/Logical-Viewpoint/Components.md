[설계서](../../README.md) › [Logical-Viewpoint](README.md) › Components

# 컴포넌트 구조

> **다루는 내용:** 각 컴포넌트의 책임과 계약
> **갱신 트리거:** 컴포넌트의 책임이 바뀌거나 새 컴포넌트가 추가될 때

## 컴포넌트 목록

MultiViewer는 Chrome MV3의 실행 환경 경계에 따라 다음 컴포넌트로 나뉩니다.

| 컴포넌트 | 실행 환경 | 책임 | 세부 문서 |
|---|---|---|---|
| **Background** | Service Worker | 쿠키 관리, 팔로잉 조회, API 대리 호출 | [Components/Background.md](Components/Background.md) |
| **Popup** | 팝업 페이지 | 채널 선택, 즐겨찾기 관리, 설정 변경 | [Components/Popup.md](Components/Popup.md) |
| **Dashboard** | 대시보드 탭 | 멀티뷰 화면 조립, 칸 배치, 동기화 | [Components/Dashboard.md](Components/Dashboard.md) |
| **ContentScript** | 방송 페이지 iframe | 화면 감지, 음량 제어, 상태 보고 | [Components/ContentScript.md](Components/ContentScript.md) |
| **Platforms** | 공유 라이브러리 | 치지직/SOOP 차이 흡수 | [Platforms.md](Platforms.md) |

---

## 실행 환경 경계

Chrome MV3이 강제하는 격리:

```
┌─────────────────────────────────────────────────┐
│        Popup Page (팝업 페이지)                  │
│  - 사용자 UI                                     │
│  - 채널 추가, 즐겨찾기, 설정                     │
│  - 데이터는 저장소에만 저장                      │
└─────────────────────────────────────────────────┘
                    ↕ (메시지, 저장소)
┌─────────────────────────────────────────────────┐
│  Service Worker (Background)                    │
│  - 쿠키 접근만 가능                              │
│  - 네트워크 요청 중계                            │
│  - 팔로잉 목록 조회                              │
└─────────────────────────────────────────────────┘
                    ↕ (메시지, 저장소)
┌─────────────────────────────────────────────────┐
│    Dashboard Tab (대시보드 탭)                   │
│  - 일반 웹 페이지                                │
│  - 멀티뷰 UI 조립                                │
│  - ContentScript와 통신                         │
│  └──────────────────────────────────────────┐   │
│  │  iframe (방송 화면)                      │   │
│  │  ┌──────────────────────────────────┐   │   │
│  │  │ ContentScript (주입된 스크립트)  │   │   │
│  │  │ - 화면 요소 조작                  │   │   │
│  │  │ - 상태 감시                       │   │   │
│  │  └──────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**핵심:**
- Popup과 Dashboard는 직접 함수 호출 불가
- Background도 Popup·Dashboard 내부의 화면 접근 불가
- 모든 통신은 **메시지 패싱** 또는 **브라우저 저장소**를 통함

---

## 역할 분담 원칙

### Background (Service Worker)
**언제 깨어나는가:**
- 메시지 수신
- 네트워크 요청 필요
- 타이머 발동

**언제 잠드는가:**
- 할 일이 없으면 몇 초 후 자동 종료

**따라서:**
- ✅ 쿠키 조회
- ✅ 팔로잉 목록 조회
- ✅ 네트워크 규칙 설정
- ❌ 값을 오래 들고 있기 (필요시 저장소에 저장)

### Popup (팝업 페이지)
**언제 살아있는가:**
- 사용자가 아이콘을 누른 순간부터 닫을 때까지

**언제 사라지는가:**
- 닫는 순간 메모리 통째로 제거

**따라서:**
- ✅ UI 렌더링
- ✅ 사용자 입력 처리
- ✅ 저장소에 값 기록
- ❌ 값 임시 저장 (닫히면 사라짐)

### Dashboard (대시보드 탭)
**언제 살아있는가:**
- 사용자가 탭을 열어둔 동안 (여러 시간 가능)

**할 수 없는 것:**
- 쿠키 직접 접근
- 네트워크 권한

**따라서:**
- ✅ 장시간 값 유지
- ✅ ContentScript 관리
- ✅ 저장소 변경 감지
- ❌ 쿠키 필요시 Background에 요청

### ContentScript (방송 화면 내)
**특징:**
- 남의 웹 페이지(chzzk.naver.com, soop.co.kr)에 주입된 코드
- 그 페이지의 화면에만 접근 가능
- Dashboard와만 통신

**역할:**
- ✅ 화면 요소 감시
- ✅ 음량·광고 상태 감지
- ✅ 음량 제어 등 화면 조작
- ❌ 다른 페이지 접근
- ❌ 네트워크 요청 직접 수행

### Platforms (공유 라이브러리)
**역할:**
- 치지직과 SOOP의 차이를 동일한 인터페이스로 감싸기
- Background와 Dashboard 양쪽이 로드해서 사용

**구조:**
```
Platforms/
├── chzzk.js (치지직 전용 로직)
└── soop.js (SOOP 전용 로직)
```

**이점:**
- Background와 Dashboard는 Platforms 인터페이스만 알면 됨
- 플랫폼별 차이는 Platforms 내부에 격리

---

## 다음 단계

각 컴포넌트의 상세 책임과 계약은:

- [Background.md](Components/Background.md) — Service Worker의 구체적 역할
- [Popup.md](Components/Popup.md) — 팝업 UI와 저장소 관리
- [Dashboard.md](Components/Dashboard.md) — 멀티뷰 UI와 ContentScript 관리
- [ContentScript.md](Components/ContentScript.md) — 방송 화면 조작
- [Platforms.md](Platforms.md) — 플랫폼 어댑터 구조
