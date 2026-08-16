// ── 열려 있는 대시보드에 변경 알리기 ──
// 시청 목록을 저장소에 쓰는 것만으로는 대시보드가 알지 못한다. 열려 있는 탭에
// 직접 알려야 그 자리에서 새 목록으로 바뀐다.
//
// ⚠️ 알리는 곳은 `멀티뷰 대시보드 열기` 한 곳뿐이다. 팝업에서 목록을 손보는
//    동안에는 알리지 않아, 준비를 마칠 때까지 보던 방송이 끊기지 않는다.
//    다른 곳에서 이것을 부르면 그 약속이 깨진다.
//
// 담긴 채널이 지금과 똑같으면 대시보드 쪽에서 다시 읽지 않는다. 다시 읽어 봐야
// 화면은 그대로인데 보던 방송만 끊기기 때문이다.

function findDashboardTab(callback) {
  chrome.tabs.query({ url: chrome.runtime.getURL('dashboard.html') }, (tabs) => {
    callback(tabs && tabs.length > 0 ? tabs[0] : null);
  });
}

// 대시보드가 열려 있으면 지금 시청 목록을 알린다.
// callback에는 열려 있었는지 여부를 준다.
function notifyDashboard(callback) {
  findDashboardTab((tab) => {
    if (!tab) { if (callback) callback(false); return; }
    chrome.storage.local.get(['currentViewList'], (result) => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'checkReload',
        currentViewList: result.currentViewList || []
      });
      if (callback) callback(true);
    });
  });
}
