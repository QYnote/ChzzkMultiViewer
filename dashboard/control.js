// ── 메인 ↔ 서브 교체 ──
// insertBefore로 이동 → document 내 이동이므로 iframe 재로드 없음
function swapWithMain(clickedTile, subStreamer) {
  if (!currentMain || currentMain.channelId === subStreamer.channelId) return;

  const prevMain      = { ...currentMain };
  const subIframe     = clickedTile._iframe;
  const oldMainIframe = mainIframe;

  styleAsSub(oldMainIframe);
  clickedTile.insertBefore(oldMainIframe, clickedTile.firstChild);

  styleAsMain(subIframe);
  colMain.insertBefore(subIframe, mainEmptyNotice);

  clickedTile.querySelector('.sub-tile-overlay')?.remove();
  clickedTile._iframe = oldMainIframe;
  clickedTile.dataset.channelId = prevMain.channelId;
  clickedTile.dataset.name = prevMain.name;
  clickedTile.appendChild(createSubOverlay(prevMain.name, oldMainIframe, clickedTile));

  mainIframe = subIframe;
  currentMain = subStreamer;
  mainStreamerName.textContent = subStreamer.name;
  mainEmptyNotice.style.display = 'none';
  mainInfoBar.style.display = 'flex';
  setChatFrame(subStreamer);

  const restoreVol = oldMainIframe._trackedVol ?? 1;
  console.log('[mv-swap] 스왑 볼륨 적용 | _trackedVol:', oldMainIframe._trackedVol, '| restoreVol:', restoreVol);

  function applySwapVolumes() {
    subIframe.contentWindow?.postMessage({ type: 'chzzk-mv-audio', volume: restoreVol }, '*');
    oldMainIframe?.contentWindow?.postMessage({ type: 'chzzk-mv-audio', volume: 0 }, '*');
  }

  applySwapVolumes();
  setTimeout(applySwapVolumes, 500);
  setTimeout(applySwapVolumes, 1500);
}

// ── 자동 동기화 ──
function applyAutoSync(settings) {
  autoSyncSettings = settings;
  if (noSignalTimer) { clearInterval(noSignalTimer); noSignalTimer = null; }

  if (settings.isAutoSync && settings.limitSeconds > 0) {
    syncBadge.classList.add('active');
    syncBadge.textContent = `↺ 자동동기화 (${settings.limitSeconds}s 초과 시)`;
    lastLatencyTime = Date.now();
    noSignalTimer = setInterval(() => {
      if (mainIframe && Date.now() - lastLatencyTime > 10000) {
        mainIframe.src = mainIframe.src;
        lastLatencyTime = Date.now();
      }
    }, 5000);
  } else {
    syncBadge.classList.remove('active');
    syncBadge.textContent = '';
  }
}

// ── 레이아웃 복원 ──
function restoreLayoutState() {
  chrome.storage.local.get(['dashboardLayout'], (result) => {
    const layout = String(result.dashboardLayout || 1);
    document.querySelector('.layout-wrapper').dataset.layout = layout;
    restoreSubPanelState();
  });
}

function updateHCollapseBtn(layout, collapsed) {
  if (!btnSubHCollapse) return;
  if (layout === '3') {
    btnSubHCollapse.textContent = collapsed ? '▲' : '▼';
  } else if (layout === '4') {
    btnSubHCollapse.textContent = collapsed ? '▼' : '▲';
  }
}

function applySubRows(wrapper, layout, collapsed, height) {
  const h = height !== undefined ? height : subPanelHeight;
  if (layout === '3') {
    wrapper.style.gridTemplateRows = collapsed ? '1fr 14px 0px' : `1fr 14px ${h}px`;
    if (!collapsed) colSub.style.height = h + 'px';
  } else if (layout === '4') {
    wrapper.style.gridTemplateRows = collapsed ? '0px 14px 1fr' : `${h}px 14px 1fr`;
    if (!collapsed) colSub.style.height = h + 'px';
  } else {
    colSub.style.height = '';
  }
}

function restoreSubPanelState() {
  chrome.storage.local.get(['subPanelCollapsed', 'subPanelHeight'], (result) => {
    const wrapper = document.querySelector('.layout-wrapper');
    const layout = wrapper.dataset.layout || '1';
    const collapsed = !!result.subPanelCollapsed;
    subPanelHeight = result.subPanelHeight || 148;
    if (collapsed) colSub.classList.add('sub-collapsed');
    applySubRows(wrapper, layout, collapsed);
    if (btnSubCollapse) {
      btnSubCollapse.textContent = layout === '2'
        ? (collapsed ? '◀' : '▶')
        : (collapsed ? '▶' : '◀');
    }
    updateHCollapseBtn(layout, collapsed);
  });
}
