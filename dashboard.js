// ── DOM 요소 ──
const colMain          = document.querySelector('.col-main');
const colSub           = document.querySelector('.col-sub');
const colChat          = document.querySelector('.col-chat');
const subStreamList    = document.getElementById('sub-stream-list');
const mainEmptyNotice  = document.getElementById('main-empty-notice');
const mainInfoBar      = document.getElementById('main-info-bar');
const mainStreamerName = document.getElementById('main-streamer-name');
const btnMainRefresh   = document.getElementById('btn-main-refresh');
const btnReloadAll     = document.getElementById('btn-reload-all');
const btnToggleChat    = document.getElementById('btn-toggle-chat');
const resizeHandle     = document.getElementById('resize-handle');
const chatFrame        = document.getElementById('chat-frame');
const chatEmptyNotice  = document.getElementById('chat-empty-notice');
const chatStreamerLabel = document.getElementById('chat-streamer-label');
const streamerCountEl  = document.getElementById('streamer-count');
const syncBadge        = document.getElementById('sync-badge');

let currentMain   = null;
let autoSyncTimer = null;
let mainIframe    = null;

// 메인 플레이어 볼륨 추적 (content.js → dashboard postMessage)
window.addEventListener('message', (e) => {
  if (e.data?.type !== 'chzzk-mv-vol') return;
  console.log('[mv-vol] 수신:', e.data.v, '| mainIframe 있음:', !!mainIframe, '| source 일치:', e.source === mainIframe?.contentWindow);
  if (!mainIframe) return;
  try {
    if (e.source === mainIframe.contentWindow) {
      mainIframe._trackedVol = e.data.v;
      console.log('[mv-vol] _trackedVol 저장:', mainIframe._trackedVol);
    }
  } catch (err) {
    console.error('[mv-vol] 추적 오류:', err);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  initButtonEvents();
});

// ==========================================
// iframe 생성
// ==========================================
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

// ==========================================
// 스토리지에서 목록을 읽어 화면 구성
// ==========================================
function loadDashboard() {
  if (mainIframe && mainIframe.parentNode) {
    mainIframe.parentNode.removeChild(mainIframe);
    mainIframe = null;
  }

  chrome.storage.local.get(['currentViewList', 'systemSettings'], (result) => {
    const list     = result.currentViewList || [];
    const settings = result.systemSettings  || { isAutoSync: false, limitSeconds: 10 };

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
  });
}

// ==========================================
// 메인 플레이어 세팅 (최초 로드, 새 iframe 생성)
// ==========================================
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

// ==========================================
// 채팅 iframe 세팅
// ==========================================
function setChatFrame(streamer) {
  chatFrame.src = `https://chzzk.naver.com/live/${streamer.channelId}/chat`;
  chatFrame.style.display = 'block';
  chatEmptyNotice.style.display = 'none';
  chatStreamerLabel.textContent = streamer.name;
}

// ==========================================
// 서브 타일 오버레이 생성 (iframe 참조 분리)
// ==========================================
function createSubOverlay(name, iframe, tile) {
  const overlay = document.createElement('div');
  overlay.className = 'sub-tile-overlay';
  overlay.innerHTML = `
    <span class="sub-tile-name">${name}</span>
    <div class="sub-controls">
      <button class="btn-ctrl btn-mute-toggle" title="음소거 토글">🔇</button>
      <input type="range" class="vol-slider" min="0" max="100" value="0" title="볼륨 조절">
      <button class="btn-ctrl btn-sub-refresh" title="새로고침">↻</button>
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
    const muteUrl = `https://chzzk.naver.com/live/${tile.dataset.channelId}?mute=1&mv_ext=1`;
    iframe.src = muteUrl;
    lastVol = 50;
    setMutedUI(true);
  });

  updateSliderStyle();
  return overlay;
}

// ==========================================
// 서브 타일 생성
// ==========================================
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

// ==========================================
// 메인 ↔ 서브 교체
//
// 핵심: iframe을 document에서 꺼내지 않고 다른 document 내 위치로 직접 이동
// (removeChild → 언로드 발생 / insertBefore로만 이동 → 언로드 없음)
//
// 순서:
//   1) oldMainIframe → clickedTile (colMain에서 제거됨)
//   2) subIframe     → colMain     (clickedTile에서 제거됨)
//   두 이동 모두 document 안에서 이루어짐
// ==========================================
function swapWithMain(clickedTile, subStreamer) {
  if (!currentMain || currentMain.channelId === subStreamer.channelId) return;

  const prevMain      = { ...currentMain };
  const subIframe     = clickedTile._iframe;
  const oldMainIframe = mainIframe;

  // ── 1. oldMainIframe → clickedTile 맨 앞 (colMain → clickedTile, 둘 다 document 내) ──
  styleAsSub(oldMainIframe);
  clickedTile.insertBefore(oldMainIframe, clickedTile.firstChild);

  // ── 2. subIframe → colMain (clickedTile → colMain, 둘 다 document 내) ──
  styleAsMain(subIframe);
  colMain.insertBefore(subIframe, mainEmptyNotice);

  // ── 3. 오버레이 교체 (iframe 참조 갱신) ──
  clickedTile.querySelector('.sub-tile-overlay')?.remove();
  clickedTile._iframe = oldMainIframe;
  clickedTile.dataset.channelId = prevMain.channelId;
  clickedTile.dataset.name = prevMain.name;
  clickedTile.appendChild(createSubOverlay(prevMain.name, oldMainIframe, clickedTile));

  // ── 4. 메인 상태 업데이트 ──
  mainIframe = subIframe;
  currentMain = subStreamer;
  mainStreamerName.textContent = subStreamer.name;
  mainEmptyNotice.style.display = 'none';
  mainInfoBar.style.display = 'flex';
  setChatFrame(subStreamer);

  // ── 5. 볼륨 조정: 기존 메인의 실제 볼륨을 새 메인에 그대로 적용 ──
  const restoreVol = oldMainIframe._trackedVol ?? 1;
  console.log('[mv-swap] 스왑 볼륨 적용 | _trackedVol:', oldMainIframe._trackedVol, '| restoreVol:', restoreVol);

  function applySwapVolumes() {
    subIframe.contentWindow?.postMessage({ type: 'chzzk-mv-audio', volume: restoreVol }, '*');
    oldMainIframe?.contentWindow?.postMessage({ type: 'chzzk-mv-audio', volume: 0 }, '*');
  }

  // 즉시 + 재시도 (iframe 재로드 시 content.js 재초기화 대기)
  applySwapVolumes();
  setTimeout(applySwapVolumes, 500);
  setTimeout(applySwapVolumes, 1500);
}

// ==========================================
// 자동 동기화 타이머
// ==========================================
function applyAutoSync(settings) {
  if (autoSyncTimer) { clearInterval(autoSyncTimer); autoSyncTimer = null; }

  if (settings.isAutoSync && settings.limitSeconds > 0) {
    syncBadge.classList.add('active');
    syncBadge.textContent = `↺ 자동동기화 ${settings.limitSeconds}초`;
    autoSyncTimer = setInterval(() => {
      if (mainIframe) mainIframe.src = mainIframe.src;
    }, settings.limitSeconds * 1000);
  } else {
    syncBadge.classList.remove('active');
    syncBadge.textContent = '';
  }
}

// ==========================================
// 빈 화면 상태
// ==========================================
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

// ==========================================
// 버튼 이벤트
// ==========================================
function initButtonEvents() {
  btnReloadAll?.addEventListener('click', loadDashboard);
  btnMainRefresh?.addEventListener('click', () => {
    if (mainIframe) mainIframe.src = mainIframe.src;
  });

  // ── 채팅 토글 ──
  btnToggleChat?.addEventListener('click', () => {
    const hidden = colChat.classList.toggle('chat-hidden');
    btnToggleChat.textContent = hidden ? '💬 채팅 보기' : '💬 채팅 숨기기';
  });

  // ── 서브채널 너비 리사이즈 ──
  let isResizing = false;

  resizeHandle?.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // 드래그 중 iframe이 마우스 이벤트 가로채지 않도록
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const wrapperLeft = document.querySelector('.layout-wrapper').getBoundingClientRect().left;
    const newWidth = Math.max(120, Math.min(window.innerWidth * 0.3, e.clientX - wrapperLeft));
    colSub.style.width = newWidth + 'px';
    colSub.style.minWidth = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
  });
}
