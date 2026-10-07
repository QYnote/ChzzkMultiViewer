# 프로젝트 지침

## 기능 개발 전 확인

신규 기능 개발 요청이 들어왔을 때, README.md의 `업데이트 예정 기능` 항목에 해당 기능이 등록되어 있지 않으면 개발을 바로 시작하지 않는다.

단, 다음 항목은 이 규칙에서 제외한다 (기능 개발이 아닌 프로젝트 관리로 간주):
- 리팩토링 / 코드 정리
- Git 관리 (커밋, 브랜치, 설정 등)
- 설정 파일 변경 (CLAUDE.md, manifest.json, settings 등)
- 문서 작업 (README.md·`document/` 수정 등)

대신 다음과 같이 안내한다:

> "이 기능은 설계서(README.md)의 업데이트 예정 기능 목록에 등록되어 있지 않습니다. 개발 전에 설계서 Todo를 먼저 정리해 주세요."

이후 사용자가 README.md에 기능을 추가하거나, 명시적으로 진행 의사를 밝힌 경우에만 개발을 시작한다.

---

## Todo 관리 규칙

### 항목 추가 시
README.md의 `업데이트 예정 기능`에 항목을 추가한 경우, feature 브랜치를 만들지 않고 develop에 바로 커밋한다. 개발 커밋과는 별개의 커밋으로 남긴다.

### 개발 완료 시 (feature → develop merge)
커밋 절차 3번에 따라 완료된 항목을 `[x]`로 표시한다.

### 배포 시 (develop → master)
배포 절차 3번에 따라 `[x]` 항목을 전부 삭제한다.

---

## 설계서 동기화

설계서는 진입점인 `README.md`와 `document/` 폴더의 문서 세트로 구성된다. 구조는 ISO/IEC/IEEE 29148을 따라 **요구사항(무엇을 하는가)**과 **구현(무엇으로 어떻게 만들었나)**을 폴더로 가른다. 각 문서 머리말의 `다루는 내용`과 `갱신 트리거`를 보고, 작업 후 트리거에 해당하는 문서를 실제 상태에 맞게 고친다.

**먼저 명세인가 구현인가로 가른다.** 명세가 바뀌면 대응하는 구현 문서와 `Verification.md` 항목도 함께 확인한다 — 대응 표는 `document/Implementation/README.md`에 있다.

| 바뀐 것 | 갱신할 곳 |
|---|---|
| 목적·범위·지원 플랫폼·용어 | `document/Overview.md` |
| 기능 추가·제거, **요소 분해 트리** | `document/Requirements/README.md` + `Requirements/Functions/` + 영향받는 모든 문서 |
| 기능의 기대 동작·경계 조건·오류 처리 | `document/Requirements/Functions/`의 해당 요소 문서 |
| 화면 구성·알림 방식 | `document/Requirements/External-Interfaces/User-Interface.md` |
| 플랫폼이 정한 주소·쿠키·응답·화면 구조 | `document/Requirements/External-Interfaces/Chzzk.md` · `Soop.md` |
| 저장하는 데이터와 그 의미 | `document/Requirements/Data.md` |
| 받는 권한, 지켜야 하는 외부 조건 | `document/Requirements/Constraints.md` |
| 끊김·보안·데이터 보호·호환에 관한 요구 | `document/Requirements/Quality-Attributes.md` |
| 확인 범위·합격 기준 | `document/Verification.md` |
| 기술 선택 | `document/Implementation/TechStack.md` |
| 모듈 구성·의존·통신, 모듈별 책임·입출력, 모듈 사이 흐름 | `document/Implementation/Modules/` |
| 빌드·배포 절차·환경, 권한 선언, 확인과 진단 방법 | `document/Implementation/Build-Deploy.md` |
| 브랜치·버전 정책 | `document/Implementation/Git.md` |
| 설치·사용 절차, 하위 문서 구성 | `README.md` |

`document/Implementation/Modules/README.md`의 "참고: 구현 파일 위치" 트리는 **갱신 의무가 없는 참고용**이다. 파일이 추가/삭제/이동되어도 반드시 고칠 필요는 없다.

### 작성 관점

전역 지침의 「명세 문서 작성 규칙」을 따른다. 이 프로젝트에서 자주 걸리는 것만 적는다.

| 이름 | 요구사항 영역 (`Requirements/` · `Overview.md` · `Verification.md`) | 구현 영역 (`Implementation/`) |
|---|---|---|
| 우리가 지은 이름 — 함수·변수·파일·CSS 클래스·저장소 키·메시지 이름 | 쓰지 않는다 | 쓰지 않는다 (예외: 파일 색인) |
| 언어·도구·브라우저 API 이름 — `chrome.storage.local`, `declarativeNetRequest` 등 | 쓰지 않는다 | 쓴다 |
| 플랫폼이 정한 값 — 쿠키 이름, 주소 형식, 응답 헤더, 채널 ID 규칙 | `External-Interfaces/Chzzk.md` · `Soop.md`**에만** | 필요한 곳에 쓴다 |
| 표준 규격이 정한 이름 — 헤더 이름 등 | 쓴다 | 쓴다 |
| 사용자 화면에 보이는 문구 — 탭·버튼 이름 | 쓴다 | 쓴다 |
| 빌드·배포 파일명과 경로, Git 브랜치 이름 | — | `Build-Deploy.md` · `Git.md` |

- 요구사항 영역은 **다른 언어로 다시 만들어도 그대로 맞아야** 한다. 판단이 서지 않으면 그 문장을 구현 영역으로 옮긴다.
- 기능 문서에는 **기대 동작 표**를 둔다. 그 표가 곧 검증 항목이다.
- 플랫폼 고유 내용은 플랫폼 문서에 적고, 다른 문서에서는 링크로 가리킨다.
- 기능 항목의 세부 내용(하위 항목) 중 추가/변경 작업 시 함께 알고 있어야 할 동작 원리, 다른 기능과의 연관 관계, 제약사항 등이 있다면, 별도의 "개발 시 고려사항" 구분을 만들지 않고 관련된 항목 바로 아래에 한 단계 더 들여쓴 하위 목록으로 기록한다.

---

## Git 관리 전략

브랜치 구조·완료 판단 기준·버전 규칙은 `document/Implementation/Git.md`에 있다. **Git 작업 전에 그 문서를 읽는다.** 여기에는 실행 절차만 적는다.

### 커밋 절차 (사용자가 정상 동작 확인 시)

1. README.md 기준으로 이번 작업에서 개발된 내역을 사용자에게 보고한다.
2. 사용자가 확인하면 커밋을 진행한다.
3. README.md의 `## 업데이트 예정 기능`에서 완료된 항목을 `[x]`로 표시한다.
4. feature 브랜치를 develop에 merge한다.
5. merge 완료 후 feature 브랜치를 삭제한다.

### 배포 절차

#### 1단계 — 배포 요청 시 ("배포하자")
1. 진행 중인 feature 브랜치가 있으면 그대로 두고 건드리지 않는다.
2. manifest.json의 version을 올린다 (단위는 `document/Implementation/Git.md`의 버전 규칙).
3. README.md의 `업데이트 예정 기능`에서 `[x]` 표시된 항목을 전부 삭제한다.
4. `document/Changelog.md`에 새 버전 항목을 추가하고 변경사항을 기록한다.
   - 사용자 관점에서 체감할 수 있는 변화 위주로 작성한다.
   - `alert()`, `innerHTML`, `textContent` 등 내부 구현 용어는 사용하지 않는다.
   - 예: "입력창 특수문자 처리 개선", "알림 UI 개선" 등으로 표현한다.
5. develop → master 병합한다.
6. 병합된 변경사항을 사용자에게 요약 보고하고, push 여부를 확인해 달라고 안내한다.

#### 2단계 — 푸시 요청 시 ("푸시하자")
1. master를 origin/master에 push한다.
2. 배포 파일(ZIP)을 master 기준으로 생성한다.

### hotfix 절차

1. master에서 `hotfix/설명` 브랜치를 생성한다.
2. 긴급 수정을 완료한다.
3. master에 병합 후 버전 0.0.1 상승.
4. develop에도 동일하게 병합하여 수정 내용을 반영한다.
