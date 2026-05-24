// 서비스 워커 가동 시 SameSite 쿠키 제한을 무력화하는 브라우저 네트워크 규칙 강제 바인딩
chrome.runtime.onInstalled.addListener(() => {
  setupNetworkCookieRules();
  injectSessionCookies();
});

chrome.runtime.onStartup.addListener(() => {
  setupNetworkCookieRules();
  injectSessionCookies();
});

// 네이버 로그인/로그아웃 감지 → 쿠키 규칙 갱신
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (cookie.domain.includes('naver.com')) {
    injectSessionCookies();
  }
});

function setupNetworkCookieRules() {
  if (!chrome.declarativeNetRequest) return;

  const RULE_ID = 2002;
  const chzzkRule = {
    id: RULE_ID,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "Origin", operation: "set", value: "https://chzzk.naver.com" },
        { header: "Referer", operation: "set", value: "https://chzzk.naver.com/" }
      ]
    },
    condition: {
      urlFilter: "https://api.chzzk.naver.com/*",
      resourceTypes: ["xmlhttprequest"]
    }
  };

  // 기존 규칙 초기화 후 크로스 도메인 쿠키 공유 필터 규칙 해제 등록
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: [chzzkRule]
  }, () => {
    console.log("치지직 세션 패스 네트워크 규칙이 정상 등록되었습니다.");
  });
}

// 브라우저의 네이버 로그인 쿠키를 읽어 iframe 및 API 요청에 직접 주입
// (chrome-extension:// 오리진에서 SameSite=Lax 쿠키가 차단되는 문제 우회)
async function injectSessionCookies() {
  if (!chrome.cookies || !chrome.declarativeNetRequest) return;

  const IFRAME_RULE_ID = 2003; // chzzk.naver.com iframe(sub_frame) 쿠키 주입
  const API_RULE_ID    = 2004; // api.chzzk.naver.com fetch(xmlhttprequest) 쿠키 주입

  try {
    // chzzk.naver.com 쿠키 + 네이버 공통 인증 쿠키(NID_AUT, NID_SES 등) 모두 수집
    const [chzzkCookies, naverCookies] = await Promise.all([
      chrome.cookies.getAll({ url: 'https://chzzk.naver.com/' }),
      chrome.cookies.getAll({ url: 'https://naver.com/' })
    ]);

    // 이름 기준 중복 제거 (chzzk 쿠키 우선)
    const cookieMap = new Map();
    naverCookies.forEach(c => cookieMap.set(c.name, c.value));
    chzzkCookies.forEach(c => cookieMap.set(c.name, c.value));

    if (cookieMap.size === 0) {
      chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [IFRAME_RULE_ID, API_RULE_ID] });
      return;
    }

    const cookieStr = [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [IFRAME_RULE_ID, API_RULE_ID],
      addRules: [
        {
          id: IFRAME_RULE_ID,
          priority: 2,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{ header: 'Cookie', operation: 'set', value: cookieStr }]
          },
          condition: {
            urlFilter: 'https://chzzk.naver.com/*',
            resourceTypes: ['sub_frame']
          }
        },
        {
          id: API_RULE_ID,
          priority: 2,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{ header: 'Cookie', operation: 'set', value: cookieStr }]
          },
          condition: {
            urlFilter: 'https://api.chzzk.naver.com/*',
            resourceTypes: ['xmlhttprequest', 'other']
          }
        }
      ]
    });
  } catch (e) {
    console.error('세션 쿠키 주입 실패:', e);
  }
}

// 팝업창 신호 수신 컨트롤러
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "fetchFollowingList") {
    const chzzkApiUrl = 'https://api.chzzk.naver.com/service/v1/channels/followings?page=0&size=500&sortType=FOLLOW';
    
    // 네트워크 레벨 변조 규칙이 먹힌 상태에서 완전한 자격증명으로 원격 fetch 요청
    fetch(chzzkApiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
    .then(async response => {
      const status = response.status;
      let data = null;
      try { data = await response.json(); } catch (e) {}
      if (!response.ok) {
        sendResponse({ success: false, httpStatus: status, data });
      } else {
        sendResponse({ success: true, data });
      }
    })
    .catch(error => {
      console.error('Background Master Fetch Error:', error);
      sendResponse({ success: false, error: error.toString() });
    });

    return true; // 비동기 연결 보존
  }
});