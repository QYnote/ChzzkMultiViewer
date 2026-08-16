// ── 저장된 목록 저장소 ──
// 저장된 목록은 채널 즐겨찾기와 **완전히 별개인 공간**이다. 한쪽을 지워도 다른 쪽은 그대로다.
// 목록 한 벌 = { name, channels: [{ channelId, name, platform }] }
//
// 채널마다 닉네임과 플랫폼까지 담는 까닭은, 불러올 때 시청 목록을 그 자리에서
// 완성하기 위해서다. 고유 ID만 담으면 불러올 때마다 이름을 조회해야 하고,
// 조회가 실패하면 이름 없는 항목이 생긴다.

function getSavedLists(callback) {
  chrome.storage.local.get(['savedViewLists'], (result) => {
    callback(Array.isArray(result.savedViewLists) ? result.savedViewLists : []);
  });
}

function setSavedLists(lists, callback) {
  chrome.storage.local.set({ savedViewLists: lists }, callback || (() => {}));
}

function toStoredChannel(streamer) {
  return {
    channelId: streamer.channelId,
    name: streamer.name,
    platform: streamer.platform || 'chzzk'
  };
}

// ── 지금 시청 목록을 한 벌로 저장 ──
// 같은 이름이 이미 있으면 그 자리를 덮어쓴다. 덮어쓸지는 부르는 쪽이 먼저 묻는다.
// callback에는 담긴 채널 수를 준다.
function saveCurrentViewAsList(name, callback) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const channels = (result.currentViewList || []).map(toStoredChannel);
    getSavedLists((lists) => {
      const index = lists.findIndex(l => l.name === name);
      if (index >= 0) lists[index] = { name, channels };
      else lists.push({ name, channels });
      setSavedLists(lists, () => callback(channels.length));
    });
  });
}

function deleteSavedList(name, callback) {
  getSavedLists((lists) => {
    setSavedLists(lists.filter(l => l.name !== name), callback);
  });
}

// 이름 바꾸기. 바꾸려는 이름이 이미 있으면 아무것도 하지 않고 false를 준다.
function renameSavedList(oldName, newName, callback) {
  getSavedLists((lists) => {
    if (lists.some(l => l.name === newName)) { callback(false); return; }
    const target = lists.find(l => l.name === oldName);
    if (!target) { callback(false); return; }
    target.name = newName;
    setSavedLists(lists, () => callback(true));
  });
}

// ── 시청 목록을 통째로 갈아끼우기 ──
// 지금 목록은 사라진다. 사라져도 되는지는 부르는 쪽이 먼저 묻는다.
//
// 열려 있는 대시보드에는 알리지 않는다. 목록을 손보는 동안 보던 방송이 끊기지
// 않도록, 반영은 `멀티뷰 대시보드 열기`를 누를 때 한꺼번에 한다. 채널을 하나씩
// 더하고 빼는 다른 조작들도 저장만 하므로 이쪽만 예외로 두지 않는다.
function replaceCurrentView(channels, callback) {
  const list = (channels || []).map(toStoredChannel);
  chrome.storage.local.set({ currentViewList: list }, () => callback());
}
