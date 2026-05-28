// ── DOM 요소 (전역 공유) ──
var tabButtons             = document.querySelectorAll('.tab-btn');
var tabContents            = document.querySelectorAll('.tab-content');
var currentViewListDiv     = document.getElementById('current-view-list');
var btnOpenDashboard       = document.getElementById('btn-open-dashboard');
var favoriteMasterListDiv  = document.getElementById('favorite-master-list');
var inputChannelId         = document.getElementById('input-channel-id');
var inputStreamerName       = document.getElementById('input-streamer-name');
var btnAddManual           = document.getElementById('btn-add-manual');
var btnLoadFollowing       = document.getElementById('btn-load-following');
var followingSyncContainer = document.getElementById('following-sync-container');
var followingApiListDiv    = document.getElementById('following-api-list');
var chkAutoSync            = document.getElementById('chk-auto-sync');
var numLimitSeconds        = document.getElementById('num-limit-seconds');

document.addEventListener('DOMContentLoaded', () => {
  initTabEvent();
  loadAndRenderData();
  initButtonEvents();
});

// ── 탭 전환 ──
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

// ── 버튼 이벤트 바인딩 ──
function initButtonEvents() {
  initWatchlistEvents();
  initFollowingEvents();
  initSettingsEvents();

  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });
  }
}
