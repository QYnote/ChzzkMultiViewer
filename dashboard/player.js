// ── iframe 생성 ──
function createIframe(channelId, muted) {
  const iframe = document.createElement('iframe');
  iframe.src = `https://chzzk.naver.com/live/${channelId}?${muted ? 'mute=1&' : ''}mv_ext=1`;
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

// ── 대시보드 전체 로드 ──
function loadDashboard() {
  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
    mainIframe = null;
  }

  chrome.storage.local.get(['currentViewList', 'systemSettings'], (result) => {
    const list     = result.currentViewList || [];
    const settings = result.systemSettings  || { isAutoSync: false, limitSeconds: 10 };
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
    restoreLayoutState();
  });
}

// ── 메인 플레이어 세팅 ──
function setMainPlayer(streamer) {
  currentMain = streamer;

  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
  }

  mainIframe = createIframe(streamer.channelId, false);
  styleAsMain(mainIframe);
  colMain.insertBefore(mainIframe, mainEmptyNotice);

  mainEmptyNotice.style.display = 'none';
  mainInfoBar.style.display = 'flex';
  mainStreamerName.textContent = streamer.name;
  setChatFrame(streamer);
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
      <button class="btn-sub-remove" title="서브채널 삭제">✕</button>
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
    iframe.src = `https://chzzk.naver.com/live/${tile.dataset.channelId}?mute=1&mv_ext=1`;
    lastVol = 50;
    setMutedUI(true);
  });

  overlay.querySelector('.btn-sub-remove').addEventListener('click', (e) => {
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

  updateSliderStyle();
  return overlay;
}

// ── 서브 타일 생성 ──
function createSubTile(streamer) {
  const tile = document.createElement('div');
  tile.className = 'sub-tile';
  tile.dataset.channelId = streamer.channelId;
  tile.dataset.name = streamer.name;

  const iframe = createIframe(streamer.channelId, true);
  styleAsSub(iframe);
  tile._iframe = iframe;
  tile.appendChild(iframe);
  tile.appendChild(createSubOverlay(streamer.name, iframe, tile));

  tile.addEventListener('click', (e) => {
    if (!e.target.closest('.sub-controls')) {
      swapWithMain(tile, { channelId: tile.dataset.channelId, name: tile.dataset.name });
    }
  });

  return tile;
}
