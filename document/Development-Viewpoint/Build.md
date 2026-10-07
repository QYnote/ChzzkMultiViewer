[설계서](../../README.md) › [Development-Viewpoint](README.md) › Build

# Build

> **다루는 내용:** 빌드/배포 환경, ZIP 생성 절차, 실패 대응
> **갱신 트리거:** 빌드/배포 절차나 환경이 바뀔 때

## 본문

### 빌드 환경

번들러·트랜스파일러 없이 순수 JS/HTML/CSS로 작성되어 있어 별도 빌드 과정이 없다. `source/` 폴더를 그대로 크롬에 "압축해제된 확장 프로그램"으로 로드해서 실행한다 (설치 방법은 최상위 [README](../../README.md) 참고).

### 배포 ZIP 생성

- 위치: 저장소 루트의 `release/` 폴더 (`source/` 밖)
- 파일명 규칙: `{manifest.json의 name}_v{manifest.json의 version}.zip` — 예: `MultiStream_v2.2.0.zip`
- 압축 대상: `source/` 폴더 안의 **실행에 필요한 것만** (폴더 자체가 아니라 내부 파일들)
  - 넣는 것: `manifest.json` · `popup.html` · `dashboard.html` · `background.js` · `content.js` · `content-soop-main.js` · `dashboard/` · `platforms/` · `popup/` · `resources/`
  - 빼는 것: `document/` · `README.md` · `CLAUDE.md` · `.git` 등 실행과 무관한 것
- 버전 번호는 배포 시점에 `manifest.json`의 `version` 값을 먼저 올린 뒤, 그 값을 파일명에 반영한다
- 만든 뒤 확인: ZIP 안 `manifest.json`의 버전이 파일명과 같은지, 빼는 것이 들어가지 않았는지

### 실패 대응

- 크롬이 `chrome://extensions`에서 변경사항을 바로 인식하지 못하면 확장 카드의 새로고침 버튼으로 강제 갱신한다
- 코드 변경이 서비스 워커([Background](../Logical-Viewpoint/Components/Background.md))에 반영되지 않으면 `chrome://extensions`에서 서비스 워커를 재시작하거나 확장을 다시 로드한다
- 방송 화면 안 스크립트(`content.js`)나 대시보드를 고쳤다면, 확장을 새로고침한 뒤 **대시보드 탭을 닫고 다시 열어야** 반영된다. 이미 떠 있는 방송 화면에는 옛 코드가 그대로 돈다
- 네트워크 규칙을 고쳤다면 확장 새로고침으로 설치·업데이트 처리가 다시 돌아야 걸린다. 걸렸는지는 대시보드 콘솔에서 등록된 규칙 목록을 조회해 확인할 수 있다
