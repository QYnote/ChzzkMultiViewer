// ── DOM 요소 (전역 공유) ──
var tabButtons             = document.querySelectorAll('.tab-btn');
var tabContents            = document.querySelectorAll('.tab-content');
var currentViewListDiv     = document.getElementById('current-view-list');
var btnOpenDashboard       = document.getElementById('btn-open-dashboard');
var favoriteMasterListDiv  = document.getElementById('favorite-master-list');
var inputChannelId         = document.getElementById('input-channel-id');
var inputStreamerName       = document.getElementById('input-streamer-name');
var btnAddManual           = document.getElementById('btn-add-manual');
var btnLoadFollowing           = document.getElementById('btn-load-following');
var loginRequiredGuide         = document.getElementById('login-required-guide');
var linkGoLogin                = document.getElementById('link-go-login');
var followingSyncContainer     = document.getElementById('following-sync-container');
var followingApiListDiv        = document.getElementById('following-api-list');
var btnLoadSoopFollowing       = document.getElementById('btn-load-soop-following');
var soopLoginRequiredGuide     = document.getElementById('soop-login-required-guide');
var linkGoSoopLogin            = document.getElementById('link-go-soop-login');
var soopFollowingSyncContainer = document.getElementById('soop-following-sync-container');
var soopFollowingApiListDiv    = document.getElementById('soop-following-api-list');
var labelChannelId             = document.getElementById('label-channel-id');
var chkAutoSync            = document.getElementById('chk-auto-sync');
var numLimitSeconds        = document.getElementById('num-limit-seconds');
var selProfileDisplay      = document.getElementById('sel-profile-display');

// ── 토스트 알림 ──
var toastTimer = null;
function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = 'show ' + (type === 'error' ? 'error' : 'success');
  toastTimer = setTimeout(() => { toast.className = ''; }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  initTabEvent();
  initWatchSubtabEvents();
  initPlatformTabEvents();
  loadAndRenderData();
  initButtonEvents();
});

// ── 메인 탭 전환 ──
function initTabEvent() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// ── 시청목록 서브탭 전환 ──
function initWatchSubtabEvents() {
  document.querySelectorAll('.watch-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.watch-subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.watch-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-subtab'));
      if (target) target.classList.add('active');
    });
  });
}

// ── 플랫폼 서브탭 (치지직/SOOP) ──
function initPlatformTabEvents() {
  document.querySelectorAll('.platform-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.platform-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 숨김 라디오를 체크하여 watchlist.js의 change 핸들러가 레이블·섹션 전환을 처리하도록 위임
      const radio = document.querySelector(`input[name="platform-select"][value="${btn.dataset.platform}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

// ── 버튼 이벤트 바인딩 ──
function initButtonEvents() {
  initWatchlistEvents();
  initFollowingEvents();
  initSoopFollowingEvents();
  initSettingsEvents();

  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      const dashboardUrl = chrome.runtime.getURL('dashboard.html');
      chrome.tabs.query({ url: dashboardUrl }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
          chrome.storage.local.get(['currentViewList'], (result) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'checkReload',
              currentViewList: result.currentViewList || []
            });
            window.close();
          });
        } else {
          chrome.tabs.create({ url: dashboardUrl });
          window.close();
        }
      });
    });
  }
}
