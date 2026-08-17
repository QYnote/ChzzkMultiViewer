[설계서](../../README.md) › Logical Viewpoint

# Logical Viewpoint

> **다루는 내용:** 시스템이 어떻게 구성되는가?
> **갱신 트리거:** 계층/컴포넌트가 추가·제거되거나 책임 범위가 바뀔 때

이 관점은 **개발자(Stakeholder)의 관심사**를 다룹니다.
- "시스템은 어떤 컴포넌트로 이루어져 있나?"
- "각 컴포넌트의 책임은 뭔가?"
- "컴포넌트들 사이의 계약(인터페이스)은 뭔가?"

## 주요 내용

- **계층 구성:** Background · Popup · Dashboard · Platforms · ContentScript
- **의존 방향:** Chrome MV3이 강제하는 실행 환경 경계
- **통신 규칙:** 메시지 패싱과 브라우저 저장소

자세한 내용은 [Architecture.md](Architecture.md)를 참고하세요.

## 하위 문서

| 문서 | 설명 |
|---|---|
| [Architecture.md](Architecture.md) | 계층 구성, 의존 방향, 통신 규칙 |
| [Components.md](Components.md) | 각 컴포넌트의 책임과 계약 (작성 예정) |

## 관점별 학습 순서

Use-Case → **Logical** → Development 순서로 읽으세요.
