// ── 메인 ↔ 서브 교체 ──
// insertBefore로 이동 → document 내 이동이므로 iframe 재로드 없음
function swapWithMain(clickedTile, subStreamer) {
  if (!currentMain || currentMain.channelId === subStreamer.channelId) return;

  const prevMain      = { ...currentMain };
  const subIframe     = clickedTile._iframe;
  const oldMainIframe = mainIframe;

  // 스왑으로 와이드 모드가 풀릴 수 있으므로 기존 안내 오버레이 정리
  colMain.querySelector('.init-notice')?.remove();
  colMain.querySelector('.manual-wide-notice')?.remove();
  clickedTile.querySelector('.init-notice')?.remove();
  clickedTile.querySelector('.manual-wide-notice')?.remove();

  styleAsSub(oldMainIframe);
  clickedTile.insertBefore(oldMainIframe, clickedTile.firstChild);

  styleAsMain(subIframe);
  colMain.insertBefore(subIframe, mainEmptyNotice);

  clickedTile.querySelector('.sub-tile-overlay')?.remove();
  clickedTile._iframe = oldMainIframe;
  clickedTile.dataset.channelId = prevMain.channelId;
  clickedTile.dataset.name = prevMain.name;
  clickedTile.appendChild(createSubOverlay(prevMain.name, oldMainIframe, clickedTile));

  // 프로필 사진도 새로 차지한 채널(prevMain) 기준으로 갱신
  clickedTile.querySelector('.sub-profile-img')?.remove();
  fetchChannelImage(prevMain.channelId, (imageUrl) => {
    if (imageUrl) clickedTile.appendChild(createSubProfileImg(imageUrl, clickedTile));
  });

  mainIframe = subIframe;
  currentMain = subStreamer;
  mainStreamerName.textContent = subStreamer.name;
  mainEmptyNotice.style.display = 'none';
  mainInfoBar.style.display = 'flex';
  setChatFrame(subStreamer);

  // 와이드 모드 재시도: 새 메인/새 서브 양쪽에 초기화 안내 표시 + iframe에 재시도 요청
  colMain.appendChild(createInitNotice());
  clickedTile.appendChild(createInitNotice());
  subIframe.contentWindow?.postMessage({ type: 'chzzk-mv-retrigger-wide' }, '*');
  oldMainIframe.contentWindow?.postMessage({ type: 'chzzk-mv-retrigger-wide' }, '*');

  updateOfflineNotice(colMain, subStreamer.channelId, subIframe);
  updateOfflineNotice(clickedTile, prevMain.channelId, oldMainIframe);

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
    document.querySelectorAll('.sub-tile').forEach(tile => {
      tile._lastLatencyTime = Date.now();
    });
    noSignalTimer = setInterval(() => {
      if (mainIframe && !colMain._isOffline && Date.now() - lastLatencyTime > 10000) {
        mainIframe.src = mainIframe.src;
        lastLatencyTime = Date.now();
      }
      document.querySelectorAll('.sub-tile').forEach(tile => {
        if (tile._iframe && tile._iframe.src && !tile._isOffline
            && tile._lastLatencyTime && Date.now() - tile._lastLatencyTime > 10000) {
          tile._iframe.src = tile._iframe.src;
          tile._lastLatencyTime = Date.now();
        }
      });
    }, 5000);
  } else {
    syncBadge.classList.remove('active');
    syncBadge.textContent = '';
  }
}

// ── 서브 프로필 사진 표시 모드 적용 ──
function applyProfileDisplay(settings) {
  const wrapper = document.querySelector('.layout-wrapper');
  if (!wrapper) return;
  // 이전 버전 저장값 마이그레이션
  let display = settings.profileDisplay || 'hover-name';
  if (display === 'always') display = 'always-profile';
  if (display === 'hover')  display = 'hover-profile';
  if (display === 'none')   display = 'hover-name';
  wrapper.dataset.profileDisplay = display;
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
