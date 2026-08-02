// ── 즐겨찾기 트리 로드 (구 favoriteMasterList에서 자동 마이그레이션) ──
function getFavoriteTree(callback) {
  chrome.storage.local.get(['favoriteTree', 'favoriteMasterList'], (result) => {
    if (result.favoriteTree) {
      callback(result.favoriteTree);
      return;
    }
    const items = (result.favoriteMasterList || []).map(s => ({ channelId: s.channelId, name: s.name }));
    const tree = { id: 'root', name: '즐겨찾기', items, folders: [] };
    chrome.storage.local.set({ favoriteTree: tree }, () => callback(tree));
  });
}

// ── 즐겨찾기 트리 저장 ──
function saveFavoriteTree(tree, callback) {
  chrome.storage.local.set({ favoriteTree: tree }, callback || (() => {}));
}

// ── 스토리지 로드 및 전체 화면 렌더링 ──
function loadAndRenderData() {
  chrome.storage.local.get(['currentViewList', 'systemSettings', 'dashboardLayout'], (result) => {
    const currentList = result.currentViewList || [];

    const settings = result.systemSettings || { isAutoSync: true, limitSeconds: 10, profileDisplay: 'hover-name' };
    // 이전 버전 저장값 마이그레이션
    if (settings.profileDisplay === 'always') settings.profileDisplay = 'always-profile';
    if (settings.profileDisplay === 'hover')  settings.profileDisplay = 'hover-profile';
    if (settings.profileDisplay === 'none')   settings.profileDisplay = 'hover-name';
    if (chkAutoSync) chkAutoSync.checked = settings.isAutoSync;
    if (numLimitSeconds) numLimitSeconds.value = settings.limitSeconds;
    if (selProfileDisplay) selProfileDisplay.value = settings.profileDisplay || 'hover-name';

    const activeLayout = result.dashboardLayout || 1;
    document.querySelectorAll('.layout-opt').forEach(opt => {
      opt.classList.toggle('active', parseInt(opt.dataset.layout) === activeLayout);
    });

    getFavoriteTree((tree) => {
      const allFavIds = collectAllChannelIds(tree);
      const favListForWatchlist = [...allFavIds].map(id => ({ channelId: id }));
      renderWatchlist(currentViewListDiv, currentList, favListForWatchlist);
      renderFavoriteTree(favoriteMasterListDiv, tree, currentList);
    });
  });
}

// ── 스트리머 삭제 ──
function deleteStreamer(type, index) {
  if (type !== 'current') return;
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = result.currentViewList || [];
    list.splice(index, 1);
    chrome.storage.local.set({ currentViewList: list }, () => loadAndRenderData());
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

// ── 시청 목록 순서 변경 ──
function moveStreamer(index, direction) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = result.currentViewList || [];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    chrome.storage.local.set({ currentViewList: list }, () => loadAndRenderData());
  });
}

// ── 시청 목록 순서 변경 (드래그앤드롭, 서브 채널 전용) ──
function reorderWatchlist(fromIndex, targetChannelId, pos) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = result.currentViewList || [];
    if (fromIndex <= 0 || fromIndex >= list.length) return; // 메인(0번)은 이 경로로 이동 불가
    const [moved] = list.splice(fromIndex, 1);
    const toIdx = list.findIndex(s => s.channelId === targetChannelId);
    if (toIdx === -1 || toIdx === 0) { list.splice(fromIndex, 0, moved); return; }
    list.splice(pos === 'before' ? toIdx : toIdx + 1, 0, moved);
    chrome.storage.local.set({ currentViewList: list }, () => loadAndRenderData());
  });
}

// ── 시청목록 → 즐겨찾기 추가 (Root에 추가) ──
function addToFavorite(streamer) {
  getFavoriteTree((tree) => {
    const allIds = collectAllChannelIds(tree);
    if (allIds.has(streamer.channelId)) return;
    tree.items.push({ channelId: streamer.channelId, name: streamer.name, platform: streamer.platform || 'chzzk' });
    saveFavoriteTree(tree, () => {
      showToast(`${streamer.name}을(를) 즐겨찾기에 추가했습니다.`, 'success');
      loadAndRenderData();
    });
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
    currentList.push({ channelId: streamer.channelId, name: streamer.name, platform: streamer.platform || 'chzzk' });
    chrome.storage.local.set({ currentViewList: currentList }, () => {
      loadAndRenderData();
      showToast('시청 목록으로 안전하게 복사되었습니다.', 'success');
    });
  });
}
