// ── 스토리지 로드 및 전체 화면 렌더링 ──
function loadAndRenderData() {
  chrome.storage.local.get(['currentViewList', 'favoriteMasterList', 'systemSettings', 'dashboardLayout'], (result) => {
    const currentList = result.currentViewList || [];
    renderStreamerList(currentViewListDiv, currentList, 'current');

    const favoriteList = result.favoriteMasterList || [];
    renderStreamerList(favoriteMasterListDiv, favoriteList, 'favorite');

    const settings = result.systemSettings || { isAutoSync: true, limitSeconds: 10 };
    if (chkAutoSync) chkAutoSync.checked = settings.isAutoSync;
    if (numLimitSeconds) numLimitSeconds.value = settings.limitSeconds;

    const activeLayout = result.dashboardLayout || 1;
    document.querySelectorAll('.layout-opt').forEach(opt => {
      opt.classList.toggle('active', parseInt(opt.dataset.layout) === activeLayout);
    });
  });
}

// ── 스트리머 삭제 ──
function deleteStreamer(type, index) {
  const key = type === 'current' ? 'currentViewList' : 'favoriteMasterList';
  chrome.storage.local.get([key], (result) => {
    const list = result[key] || [];
    list.splice(index, 1);
    const saveData = {};
    saveData[key] = list;
    chrome.storage.local.set(saveData, () => loadAndRenderData());
  });
}

// ── 메인으로 설정 ──
function setAsMain(index) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = result.currentViewList || [];
    if (index <= 0 || index >= list.length) return;
    const [item] = list.splice(index, 1);
    list.unshift(item);
    chrome.storage.local.set({ currentViewList: list }, () => loadAndRenderData());
  });
}

// ── 즐겨찾기 → 시청목록 복사 ──
function copyToCurrentView(streamer) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const currentList = result.currentViewList || [];
    if (currentList.some(s => s.channelId === streamer.channelId)) {
      showToast('이미 현재 시청 목록에 올라와 있습니다.', 'error');
      return;
    }
    currentList.push({ channelId: streamer.channelId, name: streamer.name });
    chrome.storage.local.set({ currentViewList: currentList }, () => {
      loadAndRenderData();
      showToast('시청 목록으로 안전하게 복사되었습니다.', 'success');
    });
  });
}
