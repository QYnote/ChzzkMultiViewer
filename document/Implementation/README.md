[설계서](../../README.md) › 구현

# 구현

> **다루는 내용:** 요구사항을 무엇으로 어떻게 만들었는가. 구현 문서 목록과 요구사항과의 대응
> **갱신 트리거:** 구현 문서가 추가·제거되거나, 어느 구현이 어느 요구사항을 맡는지가 바뀔 때

이 영역은 **무엇으로 어떻게** 만들었는지만 적는다. 무엇을 하는지는 [요구사항](../Requirements/README.md)이 이미 말했으므로 되풀이하지 않는다. 언어나 도구를 바꾸면 이 영역만 새로 쓴다.

- 기술·도구 이름은 이 영역에서만 쓴다. 우리가 코드에서 지은 이름(함수·변수·파일·저장소 키·메시지 이름)은 여기서도 쓰지 않는다. 예외는 [모듈](Modules/README.md#참고-구현-파일-위치)의 참고용 파일 색인뿐이다.

## 문서 목록

| 문서 | 다루는 내용 |
|---|---|
| [TechStack](TechStack.md) | 기술 선택과 근거 |
| [모듈](Modules/README.md) | 모듈 구성과 의존, 모듈별 책임·입출력, 모듈 사이 흐름 |
| [빌드·배포](Build-Deploy.md) | 빌드 환경, 배포 ZIP, 설치 방식, 확인과 진단 |
| [Git](Git.md) | 브랜치 구조, 버전 규칙 |

## 요구사항과의 대응

명세가 바뀌면 오른쪽 열의 문서를 함께 확인한다.

| 요구사항 | 실현하는 구현 |
|---|---|
| [볼 채널 정하기](../Requirements/Functions/Channel-Selection.md) · [채널 모아 두기](../Requirements/Functions/Favorites.md) · [조합 보관](../Requirements/Functions/Saved-Lists.md) · [설정](../Requirements/Functions/Settings.md) | [Popup](Modules/Popup.md) · [Background](Modules/Background.md) |
| [방송 칸 띄우기](../Requirements/Functions/Multiview/Stream-Cell.md) | [Dashboard](Modules/Dashboard.md) · [Background](Modules/Background.md) · [Platforms](Modules/Platforms.md) |
| [칸 배치](../Requirements/Functions/Multiview/Layout.md) · [칸 조작](../Requirements/Functions/Multiview/Cell-Controls.md) | [Dashboard](Modules/Dashboard.md) |
| [자동 처리](../Requirements/Functions/Multiview/Automation.md) | [Dashboard](Modules/Dashboard.md) · [ContentScript](Modules/ContentScript.md) |
| [외부 인터페이스](../Requirements/External-Interfaces/README.md) | [Platforms](Modules/Platforms.md) · [Background](Modules/Background.md) · [ContentScript](Modules/ContentScript.md) |
| [데이터](../Requirements/Data.md) | [Popup](Modules/Popup.md) · [Dashboard](Modules/Dashboard.md) |
| [제약 — 권한](../Requirements/Constraints.md#2-설치-때-받는-권한) | [빌드·배포](Build-Deploy.md#권한-선언) |
| [검증](../Verification.md) | [빌드·배포 — 확인과 진단](Build-Deploy.md#확인과-진단) |
