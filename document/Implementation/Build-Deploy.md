[설계서](../../README.md) › [구현](README.md) › 빌드·배포

# 빌드·배포

> **다루는 내용:** 빌드 환경, 배포 ZIP 만들기, 배포 경로와 설치 방식, 권한 선언, 확인과 진단
> **갱신 트리거:** 빌드·배포 절차나 환경, 권한 선언, 확인 방법이 바뀔 때

## 본문

### 빌드 환경

번들러·트랜스파일러 없이 순수 JS/HTML/CSS로 작성되어 있어 별도 빌드 과정이 없다. `source/` 폴더를 그대로 크롬에 "압축해제된 확장 프로그램"으로 로드해서 실행한다.

### 배포 경로

| 경로 | 무엇이 나가나 |
|---|---|
| [크롬 웹 스토어](https://chromewebstore.google.com/detail/multistream/aapiemaagmikgejakejdlicklbdjhnal) | 배포 ZIP을 올린다. 사용자는 여기서 설치하고 자동으로 업데이트받는다 |
| GitHub 저장소 (`master` 갈래) | 소스 전체. 배포할 때마다 갱신된다 — [Git](Git.md) |
| `release/` 폴더 | 버전별 배포 ZIP 보관 |

- 버전 번호 기준은 [Git](Git.md#버전-규칙), 배포 실행 순서는 저장소 루트 `CLAUDE.md`에 있다.

### 배포 ZIP 생성

- 위치: 저장소 루트의 `release/` 폴더 (`source/` 밖)
- 파일명 규칙: `{manifest.json의 name}_v{manifest.json의 version}.zip` — 예: `MultiStream_v3.1.2.zip`
- 압축 대상: `source/` 폴더 안의 **실행에 필요한 것만** (폴더 자체가 아니라 내부 파일들)
  - 넣는 것: `manifest.json` · `popup.html` · `dashboard.html` · `background.js` · `content.js` · `content-soop-main.js` · `dashboard/` · `platforms/` · `popup/` · `resources/`
  - 빼는 것: `document/` · `README.md` · `CLAUDE.md` · `.git` 등 실행과 무관한 것
- 버전 번호는 배포 시점에 `manifest.json`의 `version` 값을 먼저 올린 뒤, 그 값을 파일명에 반영한다
- 만든 뒤 확인: ZIP 안 `manifest.json`의 버전이 파일명과 같은지, 빼는 것이 들어가지 않았는지

### 개발 중 설치

크롬의 **압축 해제된 확장 프로그램 불러오기**로 `source/` 폴더를 불러온다. 절차는 최상위 [README](../../README.md#설치-방법) 참고.

- 고른 폴더를 **그 자리에서 그대로** 읽는다. 폴더를 옮기거나 지우면 동작하지 않는다.
- 확장의 고유 식별값이 **불러온 폴더 경로로 정해진다** (`manifest.json`에 `key`가 없으므로). 같은 소스라도 다른 폴더에서 불러오면 다른 확장으로 취급되어, 저장해 둔 데이터가 이어지지 않는다. 웹 스토어로 설치한 것과도 다른 확장이다.

### 권한 선언

`manifest.json`에 선언한다. 요구사항의 권한 목록과 사유는 [제약](../Requirements/Constraints.md#2-설치-때-받는-권한).

| 선언 | 해당 요구 |
|---|---|
| `permissions`: `storage` | 브라우저 저장소 |
| `permissions`: `tabs` | 탭 조회 (주소로 대시보드 탭 찾기) |
| `permissions`: `declarativeNetRequest` | 네트워크 규칙 |
| `permissions`: `cookies` | 쿠키 읽기 |
| `permissions`: `scripting` | 스크립트 등록 (SOOP MAIN 월드) |
| `host_permissions`: 치지직·네이버·SOOP 주소 | 사이트 접근 |

- 권한을 더하거나 넓히면 배포 보고에 **바뀐 항목과 웹 스토어 심사용 사유**를 함께 드러낸다.

### 확인과 진단

[검증](../Verification.md)을 실제로 돌릴 때 쓰는 방법이다.

| 하고 싶은 것 | 방법 |
|---|---|
| 고친 코드 반영 | `chrome://extensions`에서 확장 새로고침. 방송 화면 안 스크립트나 대시보드를 고쳤다면 **대시보드 탭을 닫고 다시 열어야** 한다. 이미 떠 있는 방송 화면에는 옛 코드가 그대로 돈다 |
| 서비스 워커 반영이 안 됨 | `chrome://extensions`에서 서비스 워커를 재시작하거나 확장을 다시 로드한다 |
| 네트워크 규칙이 걸렸는지 | 대시보드 탭 개발자 도구 콘솔에서 `chrome.declarativeNetRequest.getDynamicRules()`로 등록된 규칙을 보고, `testMatchOutcome`으로 대시보드에서 연 요청에 어느 규칙이 걸리는지 본다 |
| 방송 화면이 막힘 | 대시보드 콘솔의 빨간 줄로 어느 헤더에 막혔는지 본다. 응답 헤더는 명령줄로 직접 받아 확인한다 |
| 방송 화면 안 동작 추적 | 방송 화면 안 스크립트가 찍는 콘솔 기록도 대시보드 탭 콘솔에 함께 나온다. 필터로 골라 본다 |

- 네트워크 규칙은 설치·업데이트 처리에서 걸리므로, 규칙을 고쳤다면 확장 새로고침으로 그 처리가 다시 돌아야 한다.
- 대시보드는 확장 페이지라 콘솔에서 확장 기능을 그대로 부를 수 있다. 서비스 워커 창을 따로 열지 않아도 된다.
