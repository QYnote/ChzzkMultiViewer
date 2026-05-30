// ── 공통 버튼 스타일 ──
function setMiniButtonStyle(btn, bgColor) {
  btn.style.backgroundColor = bgColor;
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.padding = '3px 8px';
  btn.style.fontSize = '11px';
  btn.style.borderRadius = '3px';
  btn.style.cursor = 'pointer';
  btn.style.width = 'auto';
}

// ── 스트리머 목록 렌더링 (시청목록 / 즐겨찾기 공용) ──
function renderStreamerList(container, list, type, currentList) {
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    const emptyText = type === 'current' ? '등록된 시청 스트리머가 없습니다.' : '보관함이 비어 있습니다.';
    container.innerHTML = `<p style="color:#999; text-align:center; margin-top:70px; font-size:12px;">${emptyText}</p>`;
    return;
  }

  list.forEach((streamer, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.style.display = 'flex';
    itemDiv.style.justifyContent = 'space-between';
    itemDiv.style.alignItems = 'center';
    itemDiv.style.padding = '6px 4px';
    itemDiv.style.borderBottom = '1px solid #eee';
    itemDiv.style.fontSize = '12px';

    const textSpan = document.createElement('span');
    textSpan.innerHTML = `<strong>${streamer.name}</strong> <span style="color:#999; font-size:10px;">(${streamer.channelId.substring(0,6)}...)</span>`;
    itemDiv.appendChild(textSpan);

    const actionGroup = document.createElement('div');
    actionGroup.style.display = 'flex';
    actionGroup.style.gap = '4px';

    if (type === 'current') {
      if (index > 0) {
        if (index > 1) {
          const btnUp = document.createElement('button');
          btnUp.textContent = '▲';
          setMiniButtonStyle(btnUp, '#868e96');
          btnUp.addEventListener('click', () => moveStreamer(index, -1));
          actionGroup.appendChild(btnUp);
        }

        if (index !== list.length - 1) {
          const btnDown = document.createElement('button');
          btnDown.textContent = '▼';
          setMiniButtonStyle(btnDown, '#868e96');
          btnDown.addEventListener('click', () => moveStreamer(index, 1));
          actionGroup.appendChild(btnDown);
        }

        const btnSetMain = document.createElement('button');
        btnSetMain.textContent = '▶ 메인';
        setMiniButtonStyle(btnSetMain, '#4D90FE');
        btnSetMain.addEventListener('click', () => setAsMain(index));
        actionGroup.appendChild(btnSetMain);
      }

      const btnDel = document.createElement('button');
      btnDel.textContent = 'X';
      setMiniButtonStyle(btnDel, '#dc3545');
      btnDel.addEventListener('click', () => deleteStreamer('current', index));
      actionGroup.appendChild(btnDel);
    } else if (type === 'favorite') {
      const inCurrent = (currentList || []).some(s => s.channelId === streamer.channelId);
      const btnCopyToCurrent = document.createElement('button');
      btnCopyToCurrent.textContent = inCurrent ? '추가됨' : '+ 시청';
      setMiniButtonStyle(btnCopyToCurrent, inCurrent ? '#bbb' : '#00c73c');
      btnCopyToCurrent.disabled = inCurrent;
      btnCopyToCurrent.style.marginRight = '4px';
      if (!inCurrent) btnCopyToCurrent.addEventListener('click', () => copyToCurrentView(streamer));

      const btnDelFav = document.createElement('button');
      btnDelFav.textContent = '삭제';
      setMiniButtonStyle(btnDelFav, '#6c757d');
      btnDelFav.addEventListener('click', () => deleteStreamer('favorite', index));

      actionGroup.appendChild(btnCopyToCurrent);
      actionGroup.appendChild(btnDelFav);
    }

    itemDiv.appendChild(actionGroup);
    container.appendChild(itemDiv);
  });
}

// ── 수동 스트리머 추가 이벤트 ──
function initWatchlistEvents() {
  if (!btnAddManual) return;
  btnAddManual.addEventListener('click', () => {
    const channelId = inputChannelId.value.trim();
    const name = inputStreamerName.value.trim();

    if (!channelId || !name) {
      showToast('채널 고유 ID와 스트리머 별명을 모두 입력해 주세요.', 'error');
      return;
    }
    if (channelId.length !== 32) {
      showToast('치지직 채널 ID는 32자리 문자열이어야 합니다.', 'error');
      return;
    }

    chrome.storage.local.get(['currentViewList'], (result) => {
      const currentList = result.currentViewList || [];
      if (currentList.some(s => s.channelId === channelId)) {
        showToast('이미 현재 시청 목록에 등록되어 있는 스트리머입니다.', 'error');
        return;
      }
      currentList.push({ channelId, name });
      chrome.storage.local.set({ currentViewList: currentList }, () => {
        showToast(`${name} 스트리머가 시청 목록에 추가되었습니다.`, 'success');
        if (inputChannelId) inputChannelId.value = '';
        if (inputStreamerName) inputStreamerName.value = '';
        loadAndRenderData();
        const tab1Btn = document.querySelector('[data-tab="tab1"]');
        if (tab1Btn) tab1Btn.click();
      });
    });
  });
}
