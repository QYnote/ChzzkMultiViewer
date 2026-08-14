// ── 자동 동기화 ──
// 영상 신호가 한동안 없으면 그 칸만 다시 읽어들인다.
function applyAutoSync(settings) {
  autoSyncSettings = settings;
  if (noSignalTimer) { clearInterval(noSignalTimer); noSignalTimer = null; }

  if (settings.isAutoSync && settings.limitSeconds > 0) {
    syncBadge.classList.add('active');
    syncBadge.textContent = `↺ 자동동기화 (${settings.limitSeconds}s 초과 시)`;
    channelBoxes.forEach(box => { box._lastLatencyTime = Date.now(); });

    noSignalTimer = setInterval(() => {
      channelBoxes.forEach(box => {
        const iframe = box._iframe;
        if (!iframe || !iframe.getAttribute('src') || box._isOffline || !box._lastLatencyTime) return;
        // 광고 중에는 영상 신호가 끊긴 것으로 보지 않는다
        if (iframe._isAd) {
          box._lastLatencyTime = Date.now();
        } else if (Date.now() - box._lastLatencyTime > 10000) {
          iframe.src = iframe.src;
          box._lastLatencyTime = Date.now();
        }
      });
    }, 5000);
  } else {
    syncBadge.classList.remove('active');
    syncBadge.textContent = '';
  }
}

// ── 채널 표시 방식 적용 ──
function applyProfileDisplay(settings) {
  if (!stageEl) return;
  // 이전 버전 저장값 마이그레이션
  let display = settings.profileDisplay || 'hover-name';
  if (display === 'always') display = 'always-profile';
  if (display === 'hover')  display = 'hover-profile';
  if (display === 'none')   display = 'hover-name';
  stageEl.dataset.profileDisplay = display;
}
