// ── 설정 저장 ──
function saveSettings() {
  const systemSettings = {
    isAutoSync: chkAutoSync ? chkAutoSync.checked : true,
    limitSeconds: numLimitSeconds ? (parseInt(numLimitSeconds.value, 10) || 10) : 10,
    profileDisplay: selProfileDisplay ? selProfileDisplay.value : 'hover-name'
  };
  chrome.storage.local.set({ systemSettings });
}

// ── 설정 탭 이벤트 바인딩 ──
function initSettingsEvents() {
  const versionEl = document.getElementById('version-display');
  if (versionEl) versionEl.textContent = 'v' + chrome.runtime.getManifest().version;

  if (chkAutoSync) chkAutoSync.addEventListener('change', saveSettings);
  if (numLimitSeconds) numLimitSeconds.addEventListener('input', saveSettings);
  if (selProfileDisplay) selProfileDisplay.addEventListener('change', saveSettings);
}
