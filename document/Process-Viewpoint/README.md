[설계서](../../README.md) › Process Viewpoint

# Process Viewpoint

> **다루는 내용:** 런타임에 어떻게 동작하는가?
> **갱신 트리거:** 메시지 흐름이 변경되거나 비동기 처리 방식이 바뀔 때

이 관점은 **개발자·테스터(Stakeholder)의 관심사**를 다룹니다.
- "사용자가 버튼을 누르면 실제로 뭐가 일어나나?"
- "여러 컴포넌트 사이의 메시지 흐름은 어떻게 되나?"
- "비동기 동작은 어떤 순서로 벌어지나?"

## 주요 내용

- **확장 프로그램 생명주기:** 설치, 활성화, 종료
- **주요 흐름:** 채널 추가, 배치 변경, 자동 새로고침 등
- **메시지 패싱:** Background ↔ Popup/Dashboard 간 요청·응답

## 하위 문서

| 문서 | 설명 |
|---|---|
| [Flows-UserInteractions.md](Flows-UserInteractions.md) | 사용자 상호작용 흐름 (채널 추가, 팔로잉, 화면 조작, 배치 저장, 설정 변경) |
| [Flows-Lifecycle.md](Flows-Lifecycle.md) | 확장 생명주기 (초기화, 상태 전이, 팝업/대시보드 생명주기) |

## 관점별 학습 순서

Use-Case → Logical → Process 순서로 읽으세요.
기능을 수정할 때, 수정이 어떤 흐름에 영향을 미치는지 이해하기 위해 참고합니다.
