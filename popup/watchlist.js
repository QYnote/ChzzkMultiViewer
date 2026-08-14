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

// ── 시청 목록 렌더링 ──
// 모든 채널이 동등하고 화면상의 자리는 대시보드가 기억한다. 그래서 이 목록에는
// 순서라는 개념이 없다. 어떤 채널을 띄울지만 정하는 자리다.
function renderWatchlist(container, list, favoriteList) {
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p style="color:#999; text-align:center; margin-top:70px; font-size:12px;">등록된 시청 스트리머가 없습니다.</p>';
    return;
  }

  list.forEach((streamer, index) => {
    container.appendChild(buildStreamerItem(streamer, index, list, favoriteList));
  });
}

// ── 시청 목록 항목 DOM 생성 ──
function buildStreamerItem(streamer, index, list, favoriteList) {
  const itemDiv = document.createElement('div');
  itemDiv.style.display = 'flex';
  itemDiv.style.justifyContent = 'space-between';
  itemDiv.style.alignItems = 'center';
  itemDiv.style.padding = '2px 4px';
  itemDiv.style.borderBottom = '1px solid #eee';
  itemDiv.style.fontSize = '12px';

  const textSpan = document.createElement('span');
  textSpan.style.cssText = 'display:flex; align-items:center; gap:5px; overflow:hidden;';

  const iconEl = document.createElement('img');
  iconEl.className = 'platform-icon';
  iconEl.src = (streamer.platform === 'soop')
    ? 'resources/soop_icon_16.jpg'
    : 'resources/chzzk_icon_16.jpg';
  iconEl.alt = '';
  textSpan.appendChild(iconEl);

  const nameStrong = document.createElement('strong');
  nameStrong.textContent = streamer.name;
  textSpan.appendChild(nameStrong);

  itemDiv.appendChild(textSpan);

  const actionGroup = document.createElement('div');
  actionGroup.style.display = 'flex';
  actionGroup.style.gap = '4px';

  // ★ 즐겨찾기 — 팔로잉 목록과 같은 방식. 이미 등록되어 있으면 노란 별로 두고 잠근다
  const inFav = (favoriteList || []).some(s => s.channelId === streamer.channelId);
  const btnFav = document.createElement('button');
  btnFav.textContent = inFav ? '★' : '☆';
  btnFav.title = inFav ? '이미 즐겨찾기에 있습니다' : '즐겨찾기 추가';
  setMiniButtonStyle(btnFav, inFav ? '#e6a817' : '#bbb');
  btnFav.disabled = inFav;
  if (!inFav) {
    btnFav.addEventListener('click', (e) => {
      e.stopPropagation();
      addToFavorite(streamer);
    });
  }
  actionGroup.appendChild(btnFav);

  // X 버튼
  const btnDel = document.createElement('button');
  btnDel.textContent = 'X';
  setMiniButtonStyle(btnDel, '#dc3545');
  btnDel.addEventListener('click', () => deleteStreamer('current', index));
  actionGroup.appendChild(btnDel);

  itemDiv.appendChild(actionGroup);
  return itemDiv;
}

// ── 수동 스트리머 추가 이벤트 ──
function initWatchlistEvents() {
  if (!btnAddManual) return;

  // 플랫폼 선택 시 채널 ID 라벨/플레이스홀더 변경 + 팔로잉 섹션 토글
  document.querySelectorAll('input[name="platform-select"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const chzzkSection = document.getElementById('chzzk-following-section');
      const soopSection  = document.getElementById('soop-following-section');
      const isSoop = radio.value === 'soop';

      if (inputChannelId && labelChannelId) {
        if (isSoop) {
          labelChannelId.textContent = 'SOOP 채널 ID';
          inputChannelId.placeholder = '예: madaomm (방송 URL에서 복사)';
        } else {
          labelChannelId.textContent = '채널 고유 ID (32자리 난수)';
          inputChannelId.placeholder = '예: 2b3c4d... 주소창에서 복사';
        }
      }

      if (chzzkSection) chzzkSection.style.display = isSoop ? 'none' : '';
      if (soopSection)  soopSection.style.display  = isSoop ? '' : 'none';
    });
  });

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
    const platform = document.querySelector('input[name="platform-select"]:checked')?.value || 'chzzk';

    if (!channelId || !name) {
      showToast('채널 고유 ID와 스트리머 별명을 모두 입력해 주세요.', 'error');
      return;
    }

    if (platform === 'chzzk') {
      if (channelId.length !== 32) {
        showToast('치지직 채널 ID는 32자리 문자열이어야 합니다.', 'error');
        return;
      }
    } else if (platform === 'soop') {
      if (!/^[a-z0-9]+$/i.test(channelId)) {
        showToast('SOOP 채널 ID는 영문자와 숫자만 사용 가능합니다.', 'error');
        return;
      }
    }

    chrome.storage.local.get(['currentViewList'], (result) => {
      const currentList = result.currentViewList || [];
      if (currentList.some(s => s.channelId === channelId && s.platform === platform)) {
        showToast('이미 현재 시청 목록에 등록되어 있는 스트리머입니다.', 'error');
        return;
      }
      currentList.push({ channelId, name, platform });
      chrome.storage.local.set({ currentViewList: currentList }, () => {
        showToast(`${name} 스트리머가 시청 목록에 추가되었습니다.`, 'success');
        if (inputChannelId) inputChannelId.value = '';
        if (inputStreamerName) inputStreamerName.value = '';
        loadAndRenderData();
      });
    });
  });
}
