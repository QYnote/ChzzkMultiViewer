[설계서](../README.md) › [Architecture](Architecture.md) › Platforms

# Platforms

> **다루는 내용:** 플랫폼 어댑터(치지직/SOOP)의 책임과 계약 (입력/트리거/출력)
> **갱신 트리거:** 지원 플랫폼이 추가·제거되거나 어댑터 계약이 바뀔 때

## 본문

**책임**
치지직/SOOP 두 플랫폼의 차이(팔로잉 API, 방송 URL, 채팅 URL, 생방송 상태 조회 API)를 동일한 인터페이스로 감싸는 어댑터 계층.

**트리거**
호출하는 쪽(Background 또는 Dashboard)이 `getPlatform(id)`로 어댑터를 조회할 때

**계약** (모든 어댑터가 공통으로 구현)
- `fetchFollowingList()` — 로그인 세션 쿠키 기반 팔로잉 목록 조회 (네트워크 호출)
- `fetchLiveStatus(channelId)` — 생방송 여부 + 프로필 이미지 URL 조회 (네트워크 호출)
- `buildStreamUrl(channelId, muted)` — iframe에 넣을 방송 URL 생성 (순수 함수)
- `buildChatUrl(channelId)` — 채팅 iframe URL 생성, 미지원 플랫폼은 빈 문자열 (순수 함수)

**다른 모듈과의 관계**
- Background: `fetchFollowingList` / `fetchLiveStatus` 사용 — 네트워크 호출이 필요하므로 Background 컨텍스트에서만 실행
- Dashboard: `buildStreamUrl` / `buildChatUrl`만 사용 — 순수 URL 조립, 네트워크 없음
- Popup은 이 계층을 로드하지 않는다. 필요하면 반드시 Background를 거친다

**주의**
- ⚠️ SOOP은 채팅 URL이 없어 `buildChatUrl`이 항상 빈 문자열을 반환한다. Dashboard는 이 빈 문자열을 채팅 미지원 신호로 사용해 채팅 패널을 강제로 숨긴다.
