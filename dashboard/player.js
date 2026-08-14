// ── 방송 화면 만들기 ──
function buildIframeSrc(iframe) {
  const muted = iframe.dataset.muted === '1';
  return getPlatform(iframe.dataset.platform).buildStreamUrl(iframe.dataset.channelId, muted);
}

function createIframe(channelId, platform, muted) {
  const iframe = document.createElement('iframe');
  iframe.dataset.channelId = channelId;
  iframe.dataset.platform = platform || 'chzzk';
  iframe.dataset.muted = muted ? '1' : '0';
  iframe.src = buildIframeSrc(iframe);
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'autoplay; encrypted-media');
  return iframe;
}

// ── 생방송 여부 조회 ──
function checkLiveStatus(channelId, platform, callback) {
  chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId, platform: platform || 'chzzk' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) { callback(null); return; }
    callback(response.openLive);
  });
}

// ── 채널 프로필 사진 조회 (칸을 만들 때 1회) ──
function fetchChannelImage(channelId, platform, callback) {
  chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId, platform: platform || 'chzzk' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) { callback(null); return; }
    callback(response.channelImageUrl);
  });
}

// ── 프로필 사진 ──
// 칸 높이의 1/4, 원본 크기, 상한 중 가장 작은 값을 쓴다. 칸 크기가 바뀌면 다시 계산한다.
const PROFILE_MAX_PX = 64;

function createCellProfileImg(imageUrl, box) {
  const img = document.createElement('img');
  img.className = 'cell-profile-img';
  img.src = imageUrl;

  function resize() {
    const naturalSize = img.naturalHeight || Infinity;
    const targetSize = Math.min(box.clientHeight / 4, naturalSize, PROFILE_MAX_PX);
    img.style.width = targetSize + 'px';
    img.style.height = targetSize + 'px';
  }

  img.addEventListener('load', resize);
  new ResizeObserver(resize).observe(box);

  return img;
}

// ── 초기화 진행중 안내 ──
function createInitNotice() {
  const notice = document.createElement('div');
  notice.className = 'init-notice';
  notice.textContent = '초기화 진행중입니다';
  // 와이드 전환 완료 신호가 오지 않는 경우를 대비한 안전장치 (최대 1분 시도 + 여유시간)
  setTimeout(() => notice.remove(), 65000);
  return notice;
}

// ── 수동 최대화 필요 안내 ──
function createManualWideNotice(onRefresh) {
  const notice = document.createElement('div');
  notice.className = 'manual-wide-notice';
  notice.innerHTML = `
    <span class="manual-wide-label">수동 최대화 필요</span>
    <span class="manual-wide-hint">영상 위에서 T 키를 눌러 와이드 화면으로 전환 후 클릭하여 닫기</span>
    <button class="btn-manual-refresh">↻ 새로고침</button>
  `;
  notice.querySelector('.btn-manual-refresh').addEventListener('click', (e) => {
    e.stopPropagation();
    onRefresh();
    notice.remove();
  });
  notice.addEventListener('click', (e) => {
    e.stopPropagation();
    notice.remove();
  });
  return notice;
}

// ── 비방송 안내 ──
function createOfflineNotice() {
  const notice = document.createElement('div');
  notice.className = 'offline-notice';
  notice.textContent = '방송중이 아닙니다';
  return notice;
}

function updateOfflineNotice(box, channelId, iframe) {
  checkLiveStatus(channelId, iframe?.dataset.platform, (openLive) => {
    const isOffline = openLive === false;
    box._isOffline = isOffline;
    box.classList.toggle('is-offline', isOffline);

    // 방송이 없으면 영상이 시작되지 않아 와이드 전환 신호도 오지 않으므로 안내를 지운다
    if (isOffline) box.querySelector('.init-notice')?.remove();

    let notice = box.querySelector('.offline-notice');
    if (isOffline) {
      if (!notice) {
        notice = createOfflineNotice();
        box.appendChild(notice);
      }
      notice.style.display = 'flex';
      if (iframe && iframe.getAttribute('src')) iframe.removeAttribute('src');
    } else {
      if (notice) notice.style.display = 'none';
      if (iframe && !iframe.getAttribute('src')) iframe.src = buildIframeSrc(iframe);
    }
  });
}

// ── 전체 채널의 방송 여부 재확인 (1분 주기) ──
function refreshLiveStatusAll() {
  channelBoxes.forEach((box, channelId) => {
    updateOfflineNotice(box, channelId, box._iframe);
  });
}

// ── 대시보드 전체 로드 ──
function loadDashboard() {
  if (liveStatusTimer) {
    clearInterval(liveStatusTimer);
    liveStatusTimer = null;
  }

  // 상자를 모두 버리고 새로 만든다. 방송이 다시 읽히므로 목록이 바뀔 때만 부른다.
  channelBoxes.forEach(box => box.remove());
  channelBoxes.clear();

  chrome.storage.local.get(['currentViewList', 'systemSettings'], (result) => {
    const list     = result.currentViewList || [];
    const settings = result.systemSettings  || { isAutoSync: true, limitSeconds: 10, profileDisplay: 'hover-name' };
    loadedViewList = list.map(s => s.channelId);

    streamerCountEl.textContent = list.length;
    emptyNotice.style.display = list.length === 0 ? 'flex' : 'none';

    applyAutoSync(settings);
    applyProfileDisplay(settings);

    if (list.length === 0) {
      layoutTree = null;
      stageEl.querySelectorAll('.layout-handle').forEach(el => el.remove());
      return;
    }

    list.forEach(streamer => {
      const box = createChannelBox(streamer);
      channelBoxes.set(streamer.channelId, box);
      stageEl.appendChild(box);
    });

    readLayoutTree((saved) => {
      layoutTree = syncLayoutWithList(saved, loadedViewList, getStageRect());
      applyLayout();
      saveLayoutTree();
    });

    liveStatusTimer = setInterval(refreshLiveStatusAll, 60000);
  });
}

// ── 방송 화면 상자 만들기 ──
// 한 번 만들면 화면 안에서 자리만 옮길 뿐, 다른 부모로 옮기지 않는다.
function createChannelBox(streamer) {
  const box = document.createElement('div');
  box.className = 'cell-box';
  // 자리가 정해지기 전까지는 감춰 둔다. 배치를 계산한 뒤 applyLayout이 펼친다.
  box.style.display = 'none';
  box.dataset.channelId = streamer.channelId;
  box.dataset.name = streamer.name;
  box.dataset.platform = streamer.platform || 'chzzk';

  // 음소거하지 않은 채로 연다. 방송 페이지가 채널마다 기억해 둔 음량이 그대로 적용된다.
  const iframe = createIframe(streamer.channelId, streamer.platform || 'chzzk', false);
  iframe.className = 'cell-frame';
  box._iframe = iframe;
  box._lastLatencyTime = Date.now();   // 자동 동기화가 첫 신호를 기다리는 기준 시각
  box.appendChild(iframe);
  box.appendChild(createCellOverlay(streamer, iframe, box));

  // 닫기 버튼은 조작 줄의 가장 오른쪽에 붙인다
  const btnRemove = document.createElement('button');
  btnRemove.className = 'cell-tool-btn btn-cell-remove';
  btnRemove.title = '이 채널 닫기';
  btnRemove.textContent = '✕';
  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    removeChannelFromDashboard(streamer.channelId);
  });
  box.querySelector('.cell-toolbar').appendChild(btnRemove);

  const nameTag = document.createElement('div');
  nameTag.className = 'cell-name-tag';
  nameTag.textContent = streamer.name;
  box.appendChild(nameTag);

  box.appendChild(createInitNotice());
  updateOfflineNotice(box, streamer.channelId, iframe);

  fetchChannelImage(streamer.channelId, streamer.platform || 'chzzk', (imageUrl) => {
    if (imageUrl) box.appendChild(createCellProfileImg(imageUrl, box));
  });

  return box;
}

// ── 채널 하나 닫기 ──
// 시청 목록에서 빼고, 그 칸이 있던 자리는 형제 칸이 흡수한다.
function removeChannelFromDashboard(channelId) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = (result.currentViewList || []).filter(s => s.channelId !== channelId);
    loadedViewList = list.map(s => s.channelId);

    chrome.storage.local.set({ currentViewList: list }, () => {
      channelBoxes.get(channelId)?.remove();
      channelBoxes.delete(channelId);
      streamerCountEl.textContent = list.length;

      layoutTree = removeLayoutChannel(layoutTree, channelId);
      if (layoutTree) {
        applyLayout();
        saveLayoutTree();
      } else {
        stageEl.querySelectorAll('.layout-handle').forEach(el => el.remove());
        chrome.storage.local.remove('dashboardLayoutTree');
      }
      emptyNotice.style.display = list.length === 0 ? 'flex' : 'none';
    });
  });
}
