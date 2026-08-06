// ── 메인 ↔ 서브 교체 ──
// iframe을 insertBefore로 다른 부모에 옮기면 브라우저가 그 안의 문서를 버리고
// 다시 로드한다. 그래서 옮긴 직후에 보낸 메시지는 도착하지 못하고, 새 문서는
// 주소에 박힌 mute 값으로 다시 초기화된다. 아래에서 주소와 목표 볼륨을 역할에
// 맞게 다시 맞춰 준다.
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
  clickedTile.dataset.platform = prevMain.platform || 'chzzk';
  clickedTile.appendChild(createSubOverlay(prevMain.name, oldMainIframe, clickedTile));

  // 프로필 사진도 새로 차지한 채널(prevMain) 기준으로 갱신
  clickedTile.querySelector('.sub-profile-img')?.remove();
  fetchChannelImage(prevMain.channelId, prevMain.platform || 'chzzk', (imageUrl) => {
    if (imageUrl) clickedTile.appendChild(createSubProfileImg(imageUrl, clickedTile));
  });

  // 새 메인의 주소는 음소거인 채로 둔다. 소리가 켜진 주소로 로드하면
  // 브라우저의 자동 재생 차단에 걸려 영상이 시작되지 않을 수 있다.
  // 음소거 해제는 아래에서 준비 신호를 받은 뒤에 한다.
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

  // 화면과 시청 목록을 일치시킨다. 저장하지 않으면 이후 서브 순서를
  // 변경할 때 저장소의 옛 메인과 화면의 서브 목록이 어긋난다.
  saveViewListFromScreen();

  // 서브로 내려간 옛 메인은 주소까지 음소거로 바꾼다. 주소를 그대로 두면
  // 다시 로드될 때 소리가 켜진 채 시작해 서브에서 소리가 난다.
  oldMainIframe.dataset.muted = '1';
  const mutedSrc = buildIframeSrc(oldMainIframe);
  if (oldMainIframe.src !== mutedSrc) oldMainIframe.src = mutedSrc;

  // 음소거 여부만 넘기고 볼륨 수치는 넘기지 않는다. 볼륨은 방송 페이지가
  // 채널별로 기억한 값을 그대로 쓰게 두어야, 우리가 덮어쓴 값과 페이지가 보여주는
  // 상태가 어긋나지 않는다. 새 메인은 잠그지 않으므로 사용자가 직접 조절할 수 있다.
  const wasMuted = !!oldMainIframe._trackedMuted;

  setTargetAudio(oldMainIframe, { muted: true,     lock: true  });
  setTargetAudio(subIframe,     { muted: wasMuted, lock: false });
}

// ── 목표 음량 상태 지정 ──
// iframe을 다른 부모로 옮기면 브라우저가 문서를 다시 로드하므로, 옮긴 직후에
// 보낸 지정은 도착하지 못하고 사라진다. 목표 상태를 iframe에 기억해 두었다가
// 준비 신호(chzzk-mv-ready)를 받을 때마다 다시 보내 확실히 적용시킨다.
function setTargetAudio(iframe, audio) {
  if (!iframe) return;
  iframe._targetAudio = audio;
  applyTargetAudio(iframe);
}

function applyTargetAudio(iframe) {
  const audio = iframe?._targetAudio;
  if (!audio) return;
  iframe.contentWindow?.postMessage({ type: 'chzzk-mv-audio', ...audio }, '*');
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
      if (mainIframe && !colMain._isOffline) {
        if (mainIframe._isAd) {
          lastLatencyTime = Date.now();
        } else if (Date.now() - lastLatencyTime > 10000) {
          mainIframe.src = mainIframe.src;
          lastLatencyTime = Date.now();
        }
      }
      document.querySelectorAll('.sub-tile').forEach(tile => {
        if (tile._iframe && tile._iframe.src && !tile._isOffline && tile._lastLatencyTime) {
          if (tile._iframe._isAd) {
            tile._lastLatencyTime = Date.now();
          } else if (Date.now() - tile._lastLatencyTime > 10000) {
            tile._iframe.src = tile._iframe.src;
            tile._lastLatencyTime = Date.now();
          }
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
