importScripts('platforms/chzzk.js', 'platforms/soop.js', 'platforms/index.js');

// 서비스 워커 가동 시 SameSite 쿠키 제한을 무력화하는 브라우저 네트워크 규칙 강제 바인딩
chrome.runtime.onInstalled.addListener(() => {
  setupNetworkCookieRules();
  injectSessionCookies();
  registerSoopMainWorldScript();
});

chrome.runtime.onStartup.addListener(() => {
  setupNetworkCookieRules();
  injectSessionCookies();
});

// 네이버/SOOP 로그인·로그아웃 감지 → 쿠키 규칙 갱신
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (cookie.domain.includes('naver.com') || cookie.domain.includes('sooplive')) {
    injectSessionCookies();
  }
});

// SOOP iframe 내 127.0.0.1 연결 차단 스크립트를 MAIN 월드에 등록
// manifest content_scripts의 world 속성은 실제 MAIN 월드 실행을 보장하지 않아 API 방식 사용
function registerSoopMainWorldScript() {
  if (!chrome.scripting) return;
  chrome.scripting.unregisterContentScripts({ ids: ['soop-main-world'] })
    .catch(() => {})
    .then(() => chrome.scripting.registerContentScripts([{
      id: 'soop-main-world',
      matches: ['https://play.sooplive.com/*'],
      js: ['content-soop-main.js'],
      runAt: 'document_start',
      world: 'MAIN',
      allFrames: true
    }]));
}

function setupNetworkCookieRules() {
  if (!chrome.declarativeNetRequest) return;
  // 이전 버전에서 등록된 Origin/Referer 변조 규칙 일괄 제거 (레거시 1001 포함)
  // 규칙이 활성화된 상태에서는 game.naver.com 등 타 도메인의 CORS가 깨지는 부작용 존재
  chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1001, 2002] });
}

// 브라우저의 로그인 쿠키를 읽어 iframe 및 API 요청에 직접 주입
// (chrome-extension:// 오리진에서 SameSite=Lax 쿠키가 차단되는 문제 우회)
async function injectSessionCookies() {
  if (!chrome.cookies || !chrome.declarativeNetRequest) return;

  const CHZZK_IFRAME_RULE_ID = 2003; // chzzk.naver.com iframe 쿠키 주입
  const CHZZK_API_RULE_ID    = 2004; // api.chzzk.naver.com fetch 쿠키 주입
  const SOOP_IFRAME_RULE_ID  = 2005; // play.sooplive.com iframe 쿠키 주입
  const SOOP_API_RULE_ID     = 2006; // live.sooplive.com fetch 쿠키 주입

  try {
    const CHZZK_AUTH_COOKIE_NAMES = ['NID_AUT', 'NID_SES', 'nid_inf'];
    const [chzzkAuthResults, soopComCookies, soopCoKrCookies] = await Promise.all([
      Promise.all(CHZZK_AUTH_COOKIE_NAMES.map(name => chrome.cookies.get({ url: 'https://chzzk.naver.com/', name }))),
      chrome.cookies.getAll({ url: 'https://www.sooplive.com/' }),
      chrome.cookies.getAll({ url: 'https://www.sooplive.co.kr/' })
    ]);

    // 치지직: 인증 쿠키 3개만 핀포인트 수집
    const chzzkCookieMap = new Map();
    chzzkAuthResults.filter(Boolean).forEach(c => chzzkCookieMap.set(c.name, c.value));

    // SOOP: 이름 기준 중복 제거 (.com 쿠키 우선)
    const soopCookieMap = new Map();
    soopCoKrCookies.forEach(c => soopCookieMap.set(c.name, c.value));
    soopComCookies.forEach(c => soopCookieMap.set(c.name, c.value));

    const rulesToRemove = [CHZZK_IFRAME_RULE_ID, CHZZK_API_RULE_ID, SOOP_IFRAME_RULE_ID, SOOP_API_RULE_ID, SOOP_API_RULE_ID + 1]; // 2006·2007은 이제 추가하지 않고 제거만 함
    const rulesToAdd = [];

    if (chzzkCookieMap.size > 0) {
      const chzzkCookieStr = [...chzzkCookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      rulesToAdd.push(
        {
          id: CHZZK_IFRAME_RULE_ID,
          priority: 2,
          action: { type: 'modifyHeaders', requestHeaders: [{ header: 'Cookie', operation: 'set', value: chzzkCookieStr }] },
          condition: { urlFilter: 'https://chzzk.naver.com/*', resourceTypes: ['sub_frame'] }
        },
        {
          id: CHZZK_API_RULE_ID,
          priority: 2,
          action: { type: 'modifyHeaders', requestHeaders: [{ header: 'Cookie', operation: 'set', value: chzzkCookieStr }] },
          condition: { urlFilter: 'https://api.chzzk.naver.com/*', resourceTypes: ['xmlhttprequest', 'other'] }
        }
      );
    }

    if (soopCookieMap.size > 0) {
      const soopCookieStr = [...soopCookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
      rulesToAdd.push(
        {
          id: SOOP_IFRAME_RULE_ID,
          priority: 2,
          action: { type: 'modifyHeaders', requestHeaders: [{ header: 'Cookie', operation: 'set', value: soopCookieStr }] },
          condition: { urlFilter: 'https://play.sooplive.com/*', resourceTypes: ['sub_frame'] }
        }
      );
    }

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: rulesToRemove, addRules: rulesToAdd });
  } catch (e) {
    console.error('세션 쿠키 주입 실패:', e);
  }
}

// 팝업창 신호 수신 컨트롤러
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'checkSoopLogin') {
    fetch('https://myapi.sooplive.com/api/favorite', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    }).then(r => r.json())
      .then(data => sendResponse({ loggedIn: Array.isArray(data?.data) }))
      .catch(() => sendResponse({ loggedIn: false }));
    return true;
  }

  if (request.action === "fetchFollowingList") {
    const platform = getPlatform(request.platform);
    platform.fetchFollowingList()
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('Background Following List Fetch Error:', error);
        sendResponse({ success: false, error: error.toString() });
      });

    return true; // 비동기 연결 보존
  }

  if (request.action === "fetchChannelLiveStatus") {
    const platform = getPlatform(request.platform);
    platform.fetchLiveStatus(request.channelId)
      .then(({ openLive, channelImageUrl }) => {
        sendResponse({ success: true, openLive, channelImageUrl });
      })
      .catch(error => {
        console.error('Background Live Status Fetch Error:', error);
        sendResponse({ success: false, openLive: null, channelImageUrl: null });
      });

    return true; // 비동기 연결 보존
  }
});