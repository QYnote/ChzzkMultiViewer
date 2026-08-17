[설계서](../../README.md) › Development Viewpoint

# Development Viewpoint

> **다루는 내용:** 코드는 어떻게 구성되는가?
> **갱신 트리거:** 파일 구조가 바뀌거나 새 모듈이 추가되거나 빌드 프로세스가 변경될 때

이 관점은 **개발자·프로젝트 관리자(Stakeholder)의 관심사**를 다룹니다.
- "이 기능의 코드는 어디에 있나?"
- "모듈 의존성은 어떻게 되어 있나?"
- "빌드와 배포는 어떻게 하나?"

## 주요 내용

- **파일 구조:** src/ 폴더의 모듈별 구성
- **서비스:** 플랫폼별 데이터 수집 (Platforms/)
- **빌드·배포:** 번들링, 테스트, 배포 자동화
- **버전 관리:** Git 브랜치 전략, 커밋·배포 절차

## 하위 문서

| 문서 | 설명 |
|---|---|
| [FileStructure.md](FileStructure.md) | src/ 폴더 구조와 각 파일의 역할 (작성 예정) |
| [Services.md](Services.md) | 주요 모듈의 책임 (작성 예정) |
| [Platforms/Chzzk.md](Platforms/Chzzk.md) | 치지직 플랫폼 대응 구현 (이동 예정) |
| [Platforms/Soop.md](Platforms/Soop.md) | SOOP 플랫폼 대응 구현 (이동 예정) |
| [Build.md](Build.md) | 빌드 환경 및 실패 대응 (이동 예정) |
| [Git.md](Git.md) | Git 브랜치 전략 및 절차 (이동 예정) |

## 관점별 학습 순서

Use-Case → Logical → Process → **Development** 순서로 읽으세요.
새로운 기능을 구현할 때, 이 관점을 참고하여 코드를 어디에 작성할지 결정합니다.
