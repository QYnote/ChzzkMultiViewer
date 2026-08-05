[설계서](README.md) › [Architecture](Architecture.md) › Background

# Background

> **다루는 내용:** 백그라운드 서비스 워커의 책임과 계약 (입력/트리거/출력)
> **갱신 트리거:** 책임 범위나 입출력 계약이 바뀔 때

## 본문

**책임**
확장 프로그램의 인증·네트워크 대리 계층. 브라우저에 저장된 로그인 세션 쿠키를 읽어 iframe·API 요청에 주입하고, Popup·Dashboard를 대신해 외부 API를 호출한다.

**트리거**
- 확장 설치/업데이트, 브라우저 시작
- 치지직(naver.com)·SOOP(sooplive) 쿠키 변경 감지
- Popup/Dashboard의 메시지 요청 (`checkSoopLogin` / `fetchFollowingList` / `fetchChannelLiveStatus`)

**입력**
- 메시지: `{ action, platform, channelId }`
- 브라우저에 저장된 치지직·SOOP 로그인 쿠키 — 플랫폼별로 수집 범위가 다르다
  - 치지직: 네이버 인증 쿠키 `NID_AUT` · `NID_SES` · `nid_inf` 3개만 이름으로 지정해 수집
  - SOOP: `sooplive.com` · `sooplive.co.kr` 두 도메인의 쿠키 전체를 수집

**출력**
- `declarativeNetRequest` 동적 규칙 — iframe·API 요청에 Cookie 헤더 주입
- 메시지 응답 — `{ success, data }` / `{ openLive, channelImageUrl }` / `{ loggedIn }`
- SOOP iframe MAIN 월드에 ContentScript(MAIN) 등록 — 확장 설치/업데이트 시에만 수행. 등록은 브라우저를 껐다 켜도 유지되므로 시작 시마다 다시 등록하지 않는다

**다른 모듈과의 관계**
- Platforms 어댑터를 직접 로드해서 사용 — 실제 API 호출 로직 자체는 Platforms 쪽 책임
- Popup·Dashboard는 이 계층을 거치지 않고는 팔로잉 목록/생방송 상태를 알 수 없다 (직접 fetch 하지 않음)

⚠️ 공식 개발자 API를 쓰지 않고 브라우저 쿠키만으로 로그인 여부를 판단한다. 세션 만료나 쿠키 이름 변경에 취약하다.
⚠️ 로그인 여부를 판단하는 방식이 플랫폼별로 다르다. 치지직은 쿠키가 있는지만 확인하고, SOOP은 즐겨찾기 API를 실제로 호출해 정상 목록이 돌아오는지로 확인한다.
⚠️ 치지직 인증에 쓰는 세 쿠키는 치지직 전용이 아니라 네이버 전체에서 쓰이는 로그인 쿠키다. 그래서 치지직에 한 번도 들어간 적이 없어도 네이버에만 로그인돼 있으면 "치지직 로그인됨"으로 판단된다. SOOP은 응답으로 확인하므로 이런 오탐이 없다.
⚠️ SOOP 쿠키는 `.com`/`.co.kr` 두 도메인에서 이름 기준으로 병합하며, 같은 이름이면 `.com` 쿠키가 우선 적용된다.
