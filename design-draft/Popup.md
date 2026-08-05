[설계서](README.md) › [Architecture](Architecture.md) › Popup

# Popup

> **다루는 내용:** 팝업의 책임과 계약 (입력/트리거/출력)
> **갱신 트리거:** 책임 범위나 입출력 계약이 바뀔 때

## 본문

**책임**
시청 목록·즐겨찾기·설정을 관리하는 확장 프로그램의 조작 화면. 대시보드를 새로 열거나, 이미 열린 대시보드에 변경사항을 전달한다.

**트리거**
확장 아이콘 클릭으로 팝업이 열릴 때 (`DOMContentLoaded`)

**입력**
- 사용자 조작 (탭 전환, 드래그앤드롭, 폼 입력)
- `chrome.storage.local`에 저장된 현재 상태

**출력**
- `chrome.storage.local` 갱신 — `currentViewList`, `favoriteTree`, `systemSettings`, `dashboardLayout`
- Background로 메시지 요청 — 팔로잉 목록, 생방송 상태, SOOP 로그인 확인
- 대시보드 탭 열기/포커스, 이미 열려 있으면 `checkReload` 메시지 전송

**다른 모듈과의 관계**
- Background에 의존한다 (외부 API를 직접 호출하지 않음)
- Dashboard와는 storage를 매개로 간접 연결되고, 대시보드 탭이 열려 있을 때만 메시지로 직접 연결된다
- Platforms 어댑터를 로드하지 않는다

⚠️ 시청 목록의 0번 인덱스가 항상 메인 화면으로 취급된다 (별도 "메인" 필드가 없다).
