// ── DOM 요소 (전역 공유 - 다른 파일에서 참조) ──
var colMain          = document.querySelector('.col-main');
var colSub           = document.querySelector('.col-sub');
var colChat          = document.querySelector('.col-chat');
var subStreamList    = document.getElementById('sub-stream-list');
var mainEmptyNotice  = document.getElementById('main-empty-notice');
var mainInfoBar      = document.getElementById('main-info-bar');
var mainStreamerName = document.getElementById('main-streamer-name');
var btnMainRefresh   = document.getElementById('btn-main-refresh');
var btnToggleChat    = document.getElementById('btn-toggle-chat');
var resizeHandle     = document.getElementById('resize-handle');
var chatFrame        = document.getElementById('chat-frame');
var chatEmptyNotice  = document.getElementById('chat-empty-notice');
var chatStreamerLabel = document.getElementById('chat-streamer-label');
var streamerCountEl  = document.getElementById('streamer-count');
var syncBadge        = document.getElementById('sync-badge');
var mainLatencyEl    = document.getElementById('main-latency');
var btnSubCollapse   = document.getElementById('btn-sub-collapse');
var btnSubHCollapse  = document.getElementById('btn-sub-hcollapse');
var hresizeHandle    = document.getElementById('hresize-handle');

// ── 공유 상태 변수 ──
var currentMain        = null;
var mainIframe         = null;
var autoSyncSettings   = { isAutoSync: true, limitSeconds: 10 };
var lastLatencyTime    = 0;
var noSignalTimer      = null;
var subPanelHeight     = 148;
var loadedViewList     = [];
var mainLastSyncTime   = 0;
const SYNC_COOLDOWN    = 15000;
var liveStatusTimer    = null;

// ── 설정 변경 감지 (팝업에서 변경 시 즉시 반영) ──
chrome.storage.onChanged.addListener((changes) => {
  if (changes.systemSettings) {
    const settings = changes.systemSettings.newValue || { isAutoSync: true, limitSeconds: 10, profileDisplay: 'hover' };
    applyAutoSync(settings);
    applyProfileDisplay(settings);
  }
});

// ── 메인 플레이어 볼륨/딜레이 추적 (content.js → dashboard postMessage) ──
window.addEventListener('message', (e) => {
  if (e.data?.type === 'chzzk-mv-wide-done') {
    if (e.source === mainIframe?.contentWindow) {
      colMain.querySelector('.init-notice')?.remove();
      if (e.data.success === false) {
        colMain.appendChild(createManualWideNotice(() => btnMainRefresh?.click()));
      }
    } else {
      document.querySelectorAll('.sub-tile').forEach(tile => {
        if (e.source === tile._iframe?.contentWindow) {
          tile.querySelector('.init-notice')?.remove();
          if (e.data.success === false) {
            tile.appendChild(createManualWideNotice(() => tile.querySelector('.btn-sub-refresh')?.click()));
          }
        }
      });
    }
    return;
  }
  if (e.data?.type === 'chzzk-mv-latency') {
    const sec = e.data.v;
    const text = `딜레이 ${sec.toFixed(1)}s`;
    if (e.source === mainIframe?.contentWindow) {
      if (mainLatencyEl) mainLatencyEl.textContent = text;
      lastLatencyTime = Date.now();
      const now = Date.now();
      if (!colMain._isOffline && autoSyncSettings.isAutoSync && sec >= autoSyncSettings.limitSeconds
          && now - mainLastSyncTime > SYNC_COOLDOWN) {
        mainIframe.src = mainIframe.src;
        lastLatencyTime = now;
        mainLastSyncTime = now;
      }
    } else {
      document.querySelectorAll('.sub-tile').forEach(tile => {
        if (e.source === tile._iframe?.contentWindow) {
          const label = tile.querySelector('.sub-latency-label');
          if (label) label.textContent = text;
          tile._lastLatencyTime = Date.now();
          const now = Date.now();
          if (!tile._isOffline && autoSyncSettings.isAutoSync && sec >= autoSyncSettings.limitSeconds
              && tile._iframe.src
              && (!tile._lastSyncTime || now - tile._lastSyncTime > SYNC_COOLDOWN)) {
            tile._iframe.src = tile._iframe.src;
            tile._lastSyncTime = now;
          }
        }
      });
    }
    return;
  }
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== 'checkReload') return;
  const incoming = JSON.stringify((message.currentViewList || []).map(s => s.channelId));
  const current  = JSON.stringify(loadedViewList);
  if (incoming !== current) {
    loadDashboard();
  } else {
    restoreLayoutState();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  initButtonEvents();
  restoreChatState();
  restoreLayoutState();
});

// ── 버튼 이벤트 바인딩 ──
function initButtonEvents() {
  btnMainRefresh?.addEventListener('click', () => {
    if (!mainIframe) return;
    colMain.querySelector('.init-notice')?.remove();
    colMain.querySelector('.manual-wide-notice')?.remove();
    colMain.appendChild(createInitNotice());
    mainIframe.src = buildIframeSrc(mainIframe);
  });

  btnToggleChat?.addEventListener('click', () => {
    const hidden = colChat.classList.toggle('chat-hidden');
    btnToggleChat.textContent = hidden ? '💬 채팅 보기' : '💬 채팅 숨기기';
    chrome.storage.local.set({ dashboardChatHidden: hidden });
  });

  btnSubCollapse?.addEventListener('mousedown', (e) => e.stopPropagation());
  btnSubCollapse?.addEventListener('click', (e) => {
    e.stopPropagation();
    const layout = document.querySelector('.layout-wrapper').dataset.layout || '1';
    const collapsed = colSub.classList.toggle('sub-collapsed');
    btnSubCollapse.textContent = layout === '2'
      ? (collapsed ? '◀' : '▶')
      : (collapsed ? '▶' : '◀');
    chrome.storage.local.set({ subPanelCollapsed: collapsed });
  });

  btnSubHCollapse?.addEventListener('click', () => {
    const wrapper = document.querySelector('.layout-wrapper');
    const layout = wrapper.dataset.layout || '1';
    const collapsed = colSub.classList.toggle('sub-collapsed');
    applySubRows(wrapper, layout, collapsed);
    updateHCollapseBtn(layout, collapsed);
    chrome.storage.local.set({ subPanelCollapsed: collapsed });
  });

  let isResizing = false;
  let isHResizing = false;
  let hResizeStartY = 0;
  let hResizeStartHeight = 148;

  resizeHandle?.addEventListener('mousedown', (e) => {
    if (colSub.classList.contains('sub-collapsed')) return;
    isResizing = true;
    colSub.style.transition = 'none';
    resizeHandle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
    e.preventDefault();
  });

  hresizeHandle?.addEventListener('mousedown', (e) => {
    if (e.target.closest('#btn-sub-hcollapse')) return;
    if (colSub.classList.contains('sub-collapsed')) return;
    const wrapper = document.querySelector('.layout-wrapper');
    const layout = wrapper.dataset.layout;
    if (layout !== '3' && layout !== '4') return;
    isHResizing = true;
    hResizeStartY = e.clientY;
    hResizeStartHeight = colSub.offsetHeight;
    wrapper.style.transition = 'none';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      const wrapper = document.querySelector('.layout-wrapper');
      const rect = wrapper.getBoundingClientRect();
      const layout = wrapper.dataset.layout || '1';
      const maxWidth = window.innerWidth * (2 / 5);
      const newWidth = layout === '2'
        ? Math.max(120, Math.min(maxWidth, rect.right - e.clientX))
        : Math.max(120, Math.min(maxWidth, e.clientX - rect.left));
      colSub.style.width = newWidth + 'px';
      colSub.style.minWidth = newWidth + 'px';
    }
    if (isHResizing) {
      const wrapper = document.querySelector('.layout-wrapper');
      const layout = wrapper.dataset.layout;
      const delta = layout === '3' ? hResizeStartY - e.clientY : e.clientY - hResizeStartY;
      const newHeight = Math.max(60, Math.min(window.innerHeight * 0.6, hResizeStartHeight + delta));
      applySubRows(wrapper, layout, false, newHeight);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('dragging');
      colSub.style.transition = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    }
    if (isHResizing) {
      isHResizing = false;
      const wrapper = document.querySelector('.layout-wrapper');
      wrapper.style.transition = '';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
      subPanelHeight = colSub.offsetHeight;
      chrome.storage.local.set({ subPanelHeight });
    }
  });
}
