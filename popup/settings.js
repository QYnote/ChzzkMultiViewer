// ── 설정 저장 ──
function saveSettings() {
  const systemSettings = {
    isAutoSync: chkAutoSync ? chkAutoSync.checked : true,
    limitSeconds: numLimitSeconds ? (parseInt(numLimitSeconds.value, 10) || 10) : 10
  };
  chrome.storage.local.set({ systemSettings });
}

// ── 설정 탭 이벤트 바인딩 ──
function initSettingsEvents() {
  document.querySelectorAll('.layout-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.layout-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      chrome.storage.local.set({ dashboardLayout: parseInt(opt.dataset.layout) });
    });
  });

  if (chkAutoSync) chkAutoSync.addEventListener('change', saveSettings);
  if (numLimitSeconds) numLimitSeconds.addEventListener('input', saveSettings);
}
