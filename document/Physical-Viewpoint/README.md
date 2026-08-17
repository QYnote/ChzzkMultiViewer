[설계서](../../README.md) › Physical Viewpoint

# Physical Viewpoint

> **다루는 내용:** 어디에 어떻게 배치되는가?
> **갱신 트리거:** 배포 환경이 바뀌거나 저장소 위치가 변경될 때

이 관점은 **배포자·운영자(Stakeholder)의 관심사**를 다룹니다.
- "이 확장 프로그램이 실제로 어디에 설치되나?"
- "데이터는 어디에 저장되나?"
- "배포 환경은 어떻게 구성되어 있나?"

## 주요 내용

- **설치 위치:** 사용자의 Chrome 프로필 확장 폴더
- **저장소:** Chrome Storage API (로컬 스토리지)
- **배포 방식:** 로컬 개발자 모드 (현재) → Chrome 웹스토어 (향후)
- **외부 서비스:** Chzzk (naver.com), SOOP (soop.co.kr)

## 하위 문서

| 문서 | 설명 |
|---|---|
| [DataSchema.md](DataSchema.md) | Chrome Storage에 저장되는 데이터 구조 (watchList, layouts, favorites, savedLists, settings) |
| [Deployment.md](Deployment.md) | 배포 환경, 배포 위치, release/ 폴더 관리, 배포 절차 |

## 관점별 학습 순서

배포 문제를 해결할 때 이 관점을 참고합니다.
