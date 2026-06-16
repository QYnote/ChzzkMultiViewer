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
function renderStreamerList(container, list, type, currentList, favoriteList) {
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
    itemDiv.style.padding = '2px 4px';
    itemDiv.style.borderBottom = '1px solid #eee';
    itemDiv.style.fontSize = '12px';

    const textSpan = document.createElement('span');
    textSpan.style.cssText = 'display:flex; align-items:center; gap:5px; overflow:hidden;';
    const nameStrong = document.createElement('strong');
    nameStrong.textContent = streamer.name;
    const idSpan = document.createElement('span');
    idSpan.style.cssText = 'color:#999; font-size:10px;';
    idSpan.textContent = `(${streamer.channelId.substring(0, 6)}...)`;
    textSpan.appendChild(nameStrong);
    textSpan.appendChild(document.createTextNode(' '));
    textSpan.appendChild(idSpan);

    if (type === 'favorite') {
      const liveBadge = document.createElement('span');
      liveBadge.style.cssText = 'font-size:9px; padding:1px 4px; border-radius:3px; font-weight:bold; flex-shrink:0; visibility:hidden;';
      liveBadge.textContent = 'OFF';
      textSpan.appendChild(liveBadge);

      chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId: streamer.channelId }, (response) => {
        if (!response?.success || response.openLive == null) return;
        liveBadge.style.visibility = 'visible';
        if (response.openLive) {
          liveBadge.textContent = 'LIVE';
          liveBadge.style.cssText += 'background:#e50914; color:#fff;';
        } else {
          liveBadge.textContent = 'OFF';
          liveBadge.style.cssText += 'background:#e1e4e6; color:#767c82;';
        }
      });
    }

    itemDiv.appendChild(textSpan);

    const actionGroup = document.createElement('div');
    actionGroup.style.display = 'flex';
    actionGroup.style.gap = '4px';

    if (type === 'current') {
      // ▲▼ 세로 그룹
      const hasUp   = index > 1;
      const hasDown = index > 0 && index !== list.length - 1;
      const bothArrows = hasUp && hasDown;

      const arrowGroup = document.createElement('div');
      arrowGroup.style.cssText = 'display:flex; flex-direction:column; gap:2px;';

      if (hasUp) {
        const btnUp = document.createElement('button');
        btnUp.textContent = '▲';
        setMiniButtonStyle(btnUp, '#868e96');
        btnUp.style.padding = bothArrows ? '0px 5px' : '3px 5px';
        if (bothArrows) btnUp.style.fontSize = '10px';
        btnUp.addEventListener('click', () => moveStreamer(index, -1));
        arrowGroup.appendChild(btnUp);
      }
      if (hasDown) {
        const btnDown = document.createElement('button');
        btnDown.textContent = '▼';
        setMiniButtonStyle(btnDown, '#868e96');
        btnDown.style.padding = bothArrows ? '0px 5px' : '3px 5px';
        if (bothArrows) btnDown.style.fontSize = '10px';
        btnDown.addEventListener('click', () => moveStreamer(index, 1));
        arrowGroup.appendChild(btnDown);
      }
      if (arrowGroup.children.length > 0) actionGroup.appendChild(arrowGroup);

      // X 버튼
      const btnDel = document.createElement('button');
      btnDel.textContent = 'X';
      setMiniButtonStyle(btnDel, '#dc3545');
      btnDel.addEventListener('click', () => deleteStreamer('current', index));
      actionGroup.appendChild(btnDel);

      // ⋯ 더보기 버튼
      const btnMore = document.createElement('button');
      btnMore.textContent = '⋯';
      setMiniButtonStyle(btnMore, '#868e96');

      btnMore.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.watchlist-more-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'watchlist-more-menu';
        menu.style.cssText = 'position:fixed; background:#fff; border:1px solid #ddd; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:1000; min-width:130px; overflow:hidden;';

        const menuItemBase = 'padding:7px 12px; font-size:11px; white-space:nowrap;';

        // ▶ 메인으로 지정
        const itemMain = document.createElement('div');
        itemMain.style.cssText = menuItemBase + (index === 0 ? 'color:#ccc; cursor:default;' : 'color:#333; cursor:pointer;');
        itemMain.textContent = '▶ 메인으로 지정';
        if (index !== 0) {
          itemMain.addEventListener('mouseenter', () => itemMain.style.background = '#f5f5f5');
          itemMain.addEventListener('mouseleave', () => itemMain.style.background = '');
          itemMain.addEventListener('click', (e) => { e.stopPropagation(); setAsMain(index); menu.remove(); });
        }

        menu.appendChild(itemMain);

        // ☆ 즐겨찾기 추가 (이미 등록된 항목은 표시 안 함)
        const inFav = (favoriteList || []).some(s => s.channelId === streamer.channelId);
        if (!inFav) {
          const itemFav = document.createElement('div');
          itemFav.style.cssText = menuItemBase + 'color:#333; cursor:pointer;';
          itemFav.textContent = '☆ 즐겨찾기 추가';
          itemFav.addEventListener('mouseenter', () => itemFav.style.background = '#f5f5f5');
          itemFav.addEventListener('mouseleave', () => itemFav.style.background = '');
          itemFav.addEventListener('click', (e) => { e.stopPropagation(); addToFavorite(streamer); menu.remove(); });
          menu.appendChild(itemFav);
        }

        document.body.appendChild(menu);

        // 버튼 기준으로 위치 결정 (뷰포트 아래 잘리면 위로 뒤집기)
        const btnRect = btnMore.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const top = (btnRect.bottom + menuHeight > window.innerHeight)
          ? btnRect.top - menuHeight - 2
          : btnRect.bottom + 2;
        menu.style.top  = top + 'px';
        menu.style.left = (btnRect.right - menu.offsetWidth) + 'px';

        setTimeout(() => {
          document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
      });

      actionGroup.appendChild(btnMore);
    }

    itemDiv.appendChild(actionGroup);
    container.appendChild(itemDiv);
  });
}

// ── 수동 스트리머 추가 이벤트 ──
function initWatchlistEvents() {
  if (!btnAddManual) return;

  if (inputStreamerName) {
    inputStreamerName.addEventListener('input', () => {
      const filtered = inputStreamerName.value.replace(/[<>"'&]/g, '');
      if (filtered !== inputStreamerName.value) {
        inputStreamerName.value = filtered;
        showToast('특수문자(< > " \' &)는 사용할 수 없습니다.', 'error');
      }
    });
  }
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
      });
    });
  });
}
