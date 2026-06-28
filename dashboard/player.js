// ── iframe 생성 ──
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

function styleAsMain(iframe) {
  iframe.style.cssText = 'flex:1; width:100%; border:none; display:block; pointer-events:auto;';
}

function styleAsSub(iframe) {
  iframe.style.cssText = 'width:100%; height:100%; border:none; pointer-events:none; flex:none;';
}

// ── 생방송 여부 조회 ──
function checkLiveStatus(channelId, platform, callback) {
  chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId, platform: platform || 'chzzk' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) { callback(null); return; }
    callback(response.openLive);
  });
}

// ── 채널 프로필 사진 조회 (타일 생성 시 1회) ──
function fetchChannelImage(channelId, platform, callback) {
  chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId, platform: platform || 'chzzk' }, (response) => {
    if (chrome.runtime.lastError || !response?.success) { callback(null); return; }
    callback(response.channelImageUrl);
  });
}

// ── 서브 타일 프로필 사진 엘리먼트 생성 ──
// 크기 = 타일 높이의 1/4과 이미지 원본 크기 중 더 작은 값 (타일 크기 변경 시 자동 재계산)
function createSubProfileImg(imageUrl, tile) {
  const img = document.createElement('img');
  img.className = 'sub-profile-img';
  img.src = imageUrl;

  function resize() {
    const naturalSize = img.naturalHeight || Infinity;
    const targetSize = Math.min(tile.clientHeight / 4, naturalSize);
    img.style.width = targetSize + 'px';
    img.style.height = targetSize + 'px';
  }

  img.addEventListener('load', resize);
  new ResizeObserver(resize).observe(tile);

  return img;
}

// ── 초기화 진행중 안내 오버레이 ──
function createInitNotice() {
  const notice = document.createElement('div');
  notice.className = 'init-notice';
  notice.textContent = '초기화 진행중입니다';
  // 와이드 모드 전환 완료 신호가 오지 않는 경우를 대비한 안전장치 (최대 1분 시도 + 여유시간)
  setTimeout(() => notice.remove(), 65000);
  return notice;
}

// ── 수동 와이드 전환 필요 안내 오버레이 ──
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

// ── 비방송 안내 오버레이 ──
function createOfflineNotice() {
  const notice = document.createElement('div');
  notice.className = 'offline-notice';
  notice.textContent = '방송중이 아닙니다';
  return notice;
}

function updateOfflineNotice(container, channelId, iframe) {
  checkLiveStatus(channelId, iframe?.dataset.platform, (openLive) => {
    const isOffline = openLive === false;
    container._isOffline = isOffline;
    container.classList.toggle('is-offline', isOffline);

    // 비방송 상태에서는 영상이 재생되지 않아 와이드 모드 전환 신호가 오지 않으므로 즉시 제거
    if (isOffline) container.querySelector('.init-notice')?.remove();

    let notice = container.querySelector('.offline-notice');
    if (isOffline) {
      if (!notice) {
        notice = createOfflineNotice();
        container.appendChild(notice);
      }
      notice.style.display = 'flex';
      if (iframe && iframe.getAttribute('src')) iframe.removeAttribute('src');
    } else {
      if (notice) notice.style.display = 'none';
      if (iframe && !iframe.getAttribute('src')) iframe.src = buildIframeSrc(iframe);
    }
  });
}

// ── 시청 목록 전체 비방송 여부 재확인 (1분 주기) ──
function refreshLiveStatusAll() {
  if (currentMain) updateOfflineNotice(colMain, currentMain.channelId, mainIframe);
  document.querySelectorAll('.sub-tile').forEach(tile => {
    updateOfflineNotice(tile, tile.dataset.channelId, tile._iframe);
  });
}

// ── 대시보드 전체 로드 ──
function loadDashboard() {
  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
    mainIframe = null;
  }

  if (liveStatusTimer) {
    clearInterval(liveStatusTimer);
    liveStatusTimer = null;
  }

  chrome.storage.local.get(['currentViewList', 'systemSettings'], (result) => {
    const list     = result.currentViewList || [];
    const settings = result.systemSettings  || { isAutoSync: true, limitSeconds: 10, profileDisplay: 'hover-name' };
    loadedViewList = list.map(s => s.channelId);

    streamerCountEl.textContent = list.length;

    if (list.length === 0) {
      showMainEmpty();
      subStreamList.innerHTML = '<p class="sub-empty-msg">시청 목록이 비어 있습니다.<br><br>팝업에서<br>스트리머를 추가하세요.</p>';
      return;
    }

    setMainPlayer(list[0]);

    subStreamList.innerHTML = '';
    if (list.length > 1) {
      list.slice(1).forEach(s => subStreamList.appendChild(createSubTile(s)));
    } else {
      subStreamList.innerHTML = '<p class="sub-empty-msg">서브 채널이<br>없습니다.</p>';
    }

    applyAutoSync(settings);
    applyProfileDisplay(settings);
    restoreLayoutState();

    liveStatusTimer = setInterval(refreshLiveStatusAll, 60000);
  });
}

// ── 메인 플레이어 세팅 ──
function setMainPlayer(streamer) {
  currentMain = streamer;

  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
  }

  mainIframe = createIframe(streamer.channelId, streamer.platform || 'chzzk', false);
  styleAsMain(mainIframe);
  colMain.insertBefore(mainIframe, mainEmptyNotice);

  mainEmptyNotice.style.display = 'none';
  mainInfoBar.style.display = 'flex';
  mainStreamerName.textContent = streamer.name;
  setChatFrame(streamer);
  colMain.appendChild(createInitNotice());
  updateOfflineNotice(colMain, streamer.channelId, mainIframe);
}

// ── 빈 화면 상태 ──
function showMainEmpty() {
  currentMain = null;
  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
  }
  mainIframe = null;
  mainEmptyNotice.style.display = 'flex';
  mainInfoBar.style.display = 'none';
  chatFrame.style.display = 'none';
  chatFrame.src = '';
  chatEmptyNotice.style.display = 'flex';
  chatStreamerLabel.textContent = '—';
}

// ── 서브 타일 오버레이 생성 ──
function createSubOverlay(name, iframe, tile) {
  const overlay = document.createElement('div');
  overlay.className = 'sub-tile-overlay';
  overlay.innerHTML = `
    <div class="sub-tile-top">
      <span class="sub-tile-name">${name}</span>
    </div>
    <div class="sub-controls">
      <button class="btn-ctrl btn-mute-toggle" title="음소거 토글">🔇</button>
      <input type="range" class="vol-slider" min="0" max="100" value="0" title="볼륨 조절">
      <div class="sub-refresh-wrapper">
        <span class="sub-latency-label"></span>
        <button class="btn-ctrl btn-sub-refresh" title="새로고침">↻</button>
      </div>
    </div>
  `;

  const btnMute = overlay.querySelector('.btn-mute-toggle');
  const slider  = overlay.querySelector('.vol-slider');
  let lastVol   = 50;

  function updateSliderStyle() {
    slider.style.setProperty('--pct', `${slider.value}%`);
  }

  function sendVol(pct) {
    iframe.contentWindow?.postMessage({ type: 'chzzk-mv-audio', volume: pct / 100 }, '*');
  }

  function setMutedUI(muted) {
    btnMute.textContent = muted ? '🔇' : '🔊';
    btnMute.classList.toggle('unmuted', !muted);
    slider.value = muted ? 0 : lastVol;
    updateSliderStyle();
  }

  btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMuted = parseInt(slider.value) === 0;
    if (isMuted) { sendVol(lastVol); setMutedUI(false); }
    else { lastVol = parseInt(slider.value); sendVol(0); setMutedUI(true); }
  });

  slider.addEventListener('input', (e) => {
    e.stopPropagation();
    const val = parseInt(slider.value);
    sendVol(val);
    updateSliderStyle();
    if (val > 0) { lastVol = val; btnMute.textContent = '🔊'; btnMute.classList.add('unmuted'); }
    else { btnMute.textContent = '🔇'; btnMute.classList.remove('unmuted'); }
  });

  overlay.querySelector('.btn-sub-refresh').addEventListener('click', (e) => {
    e.stopPropagation();
    tile.querySelector('.init-notice')?.remove();
    tile.querySelector('.manual-wide-notice')?.remove();
    tile.appendChild(createInitNotice());
    iframe.dataset.muted = '1';
    iframe.src = buildIframeSrc(iframe);
    lastVol = 50;
    setMutedUI(true);
  });

  updateSliderStyle();
  return overlay;
}

// ── 서브 타일 생성 ──
function createSubTile(streamer) {
  const tile = document.createElement('div');
  tile.className = 'sub-tile';
  tile.dataset.channelId = streamer.channelId;
  tile.dataset.name = streamer.name;
  tile.dataset.platform = streamer.platform || 'chzzk';

  const iframe = createIframe(streamer.channelId, streamer.platform || 'chzzk', true);
  styleAsSub(iframe);
  tile._iframe = iframe;
  tile.appendChild(iframe);
  tile.appendChild(createSubOverlay(streamer.name, iframe, tile));

  const btnRemove = document.createElement('button');
  btnRemove.className = 'btn-sub-remove';
  btnRemove.title = '서브채널 삭제';
  btnRemove.textContent = '✕';
  btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    const channelId = tile.dataset.channelId;
    chrome.storage.local.get(['currentViewList'], (result) => {
      const list = (result.currentViewList || []).filter(s => s.channelId !== channelId);
      chrome.storage.local.set({ currentViewList: list }, () => {
        tile.remove();
        streamerCountEl.textContent = list.length;
        if (list.length <= 1) {
          subStreamList.innerHTML = '<p class="sub-empty-msg">서브 채널이<br>없습니다.</p>';
        }
      });
    });
  });
  tile.appendChild(btnRemove);

  const nameTag = document.createElement('div');
  nameTag.className = 'sub-tile-name-tag';
  nameTag.textContent = streamer.name;
  tile.appendChild(nameTag);

  tile.appendChild(createInitNotice());
  updateOfflineNotice(tile, streamer.channelId, iframe);

  fetchChannelImage(streamer.channelId, streamer.platform || 'chzzk', (imageUrl) => {
    if (imageUrl) tile.appendChild(createSubProfileImg(imageUrl, tile));
  });

  tile.addEventListener('click', (e) => {
    if (!e.target.closest('.sub-controls')) {
      if (colMain.querySelector('.init-notice') || tile.querySelector('.init-notice')) return;
      swapWithMain(tile, { channelId: tile.dataset.channelId, name: tile.dataset.name, platform: tile.dataset.platform || 'chzzk' });
    }
  });

  return tile;
}
