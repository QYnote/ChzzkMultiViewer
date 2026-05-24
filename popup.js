// ==========================================
// 1. UI 컨트롤 요소(DOM 객체) 선언 및 가져오기
// ==========================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const currentViewListDiv = document.getElementById('current-view-list');
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const favoriteMasterListDiv = document.getElementById('favorite-master-list');
const inputChannelId = document.getElementById('input-channel-id');
const inputStreamerName = document.getElementById('input-streamer-name');
const btnAddManual = document.getElementById('btn-add-manual');
const btnLoadFollowing = document.getElementById('btn-load-following');
const followingSyncContainer = document.getElementById('following-sync-container');
const followingApiListDiv = document.getElementById('following-api-list');
const chkAutoSync = document.getElementById('chk-auto-sync');
const numLimitSeconds = document.getElementById('num-limit-seconds');

// ==========================================
// 2. 초기화 및 데이터 로드 생명주기 (DOMContentLoaded)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTabEvent();
  loadAndRenderData();
  initButtonEvents();
});

// ==========================================
// 3. 4개 탭 레이아웃 전환 로직
// ==========================================
function initTabEvent() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ==========================================
// 4. 로컬 스토리지 데이터 로드 및 화면 렌더링
// ==========================================
function loadAndRenderData() {
  chrome.storage.local.get(['currentViewList', 'favoriteMasterList', 'systemSettings', 'dashboardLayout'], (result) => {
    const currentList = result.currentViewList || [];
    renderStreamerList(currentViewListDiv, currentList, 'current');

    const favoriteList = result.favoriteMasterList || [];
    renderStreamerList(favoriteMasterListDiv, favoriteList, 'favorite');

    const settings = result.systemSettings || { isAutoSync: true, limitSeconds: 10 };
    if (chkAutoSync) chkAutoSync.checked = settings.isAutoSync;
    if (numLimitSeconds) numLimitSeconds.value = settings.limitSeconds;

    const activeLayout = result.dashboardLayout || 1;
    document.querySelectorAll('.layout-opt').forEach(opt => {
      opt.classList.toggle('active', parseInt(opt.dataset.layout) === activeLayout);
    });
  });
}

function renderStreamerList(container, list, type) {
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
    itemDiv.style.justifyContent = 'space-between'; // ✅ 수정: justify → justifyContent
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
      if (index !== 0) {
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
      const btnCopyToCurrent = document.createElement('button');
      btnCopyToCurrent.textContent = '+ 시청';
      setMiniButtonStyle(btnCopyToCurrent, '#00c73c');
      btnCopyToCurrent.style.marginRight = '4px';
      btnCopyToCurrent.addEventListener('click', () => copyToCurrentView(streamer));

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

function copyToCurrentView(streamer) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const currentList = result.currentViewList || [];
    if (currentList.some(s => s.channelId === streamer.channelId)) {
      alert('이미 현재 시청 목록에 올라와 있습니다.');
      return;
    }
    currentList.push({ channelId: streamer.channelId, name: streamer.name });
    chrome.storage.local.set({ currentViewList: currentList }, () => {
      loadAndRenderData();
      alert('시청 목록으로 안전하게 복사되었습니다.');
    });
  });
}

function deleteStreamer(type, index) {
  const key = type === 'current' ? 'currentViewList' : 'favoriteMasterList';
  chrome.storage.local.get([key], (result) => {
    const list = result[key] || [];
    list.splice(index, 1);
    const saveData = {};
    saveData[key] = list;
    chrome.storage.local.set(saveData, () => {
      loadAndRenderData();
    });
  });
}

function setAsMain(index) {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const list = result.currentViewList || [];
    if (index <= 0 || index >= list.length) return;
    const [item] = list.splice(index, 1);
    list.unshift(item);
    chrome.storage.local.set({ currentViewList: list }, () => {
      loadAndRenderData();
    });
  });
}

// ==========================================
// 5. 버튼 및 UI 이벤트 리스너 바인딩
// ==========================================
function initButtonEvents() {
  if (btnAddManual) {
    btnAddManual.addEventListener('click', () => {
      const channelId = inputChannelId.value.trim();
      const name = inputStreamerName.value.trim();

      if (!channelId || !name) {
        alert('채널 고유 ID와 스트리머 별명을 모두 입력해 주세요.');
        return;
      }
      if (channelId.length !== 32) {
        alert('치지직 채널 ID는 32자리 문자열이어야 합니다.');
        return;
      }

      chrome.storage.local.get(['currentViewList'], (result) => {
        const currentList = result.currentViewList || [];
        if (currentList.some(s => s.channelId === channelId)) {
          alert('이미 현재 시청 목록에 등록되어 있는 스트리머입니다.');
          return;
        }
        currentList.push({ channelId, name });
        chrome.storage.local.set({ currentViewList: currentList }, () => {
          alert(`${name} 스트리머가 시청 목록에 추가되었습니다.`);
          if (inputChannelId) inputChannelId.value = '';
          if (inputStreamerName) inputStreamerName.value = '';

          loadAndRenderData();

          const tab1Btn = document.querySelector('[data-tab="tab1"]');
          if (tab1Btn) tab1Btn.click();
        });
      });
    });
  }

  // [탭 3] 치지직 팔로우 목록 불러오기 버튼
  if (btnLoadFollowing) {
    btnLoadFollowing.addEventListener('click', () => {
      followingSyncContainer.style.display = 'block';
      followingApiListDiv.innerHTML = '<p style="color:#666; text-align:center; padding:20px; font-size:12px;">치지직 팔로잉 목록 조회 중...</p>';

      chrome.runtime.sendMessage({ action: "fetchFollowingList" }, (response) => {
        if (chrome.runtime.lastError) {
          showErrorUI('런타임 오류: ' + chrome.runtime.lastError.message);
          return;
        }
        if (!response) {
          showErrorUI('응답 없음 (서비스 워커 오류)');
          return;
        }
        if (!response.success) {
          const hint = response.httpStatus
            ? `HTTP ${response.httpStatus} — ${JSON.stringify(response.data).substring(0, 120)}`
            : (response.error || '알 수 없는 오류');
          showErrorUI(hint);
          return;
        }

        const data = response.data;
        if (!data?.content) {
          showErrorUI('응답 구조 불일치: ' + JSON.stringify(data).substring(0, 200));
          return;
        }

        // 치지직 API 응답 구조에 맞게 여러 경로 시도
        let followList = data.content.followingList
          || data.content.followings
          || data.content.data
          || data.content.list
          || data.content.channels
          || data.content.channelList;

        // 위 키가 모두 없으면 content 안에서 첫 번째 배열을 자동 탐색
        if (!Array.isArray(followList)) {
          followList = Object.values(data.content).find(v => Array.isArray(v));
        }

        // content 자체가 배열인 경우
        if (!Array.isArray(followList) && Array.isArray(data.content)) {
          followList = data.content;
        }

        if (!Array.isArray(followList)) {
          showErrorUI('목록 키 탐색 실패. content 키: ' + Object.keys(data.content).join(', '));
          return;
        }

        renderFollowingApiList(followList);
      });
    });
  }

  document.querySelectorAll('.layout-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.layout-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      chrome.storage.local.set({ dashboardLayout: parseInt(opt.dataset.layout) });
    });
  });

  if (chkAutoSync) chkAutoSync.addEventListener('change', saveSettings);
  if (numLimitSeconds) numLimitSeconds.addEventListener('input', saveSettings);

  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });
  }
}

function showErrorUI(debugInfo) {
  followingApiListDiv.innerHTML = `
    <div style="text-align:center; padding:16px; font-size:12px; color:#555;">
      <p style="color:#dc3545; font-weight:bold; margin-bottom:6px;">불러오기 실패</p>
      <p style="color:#999; font-size:11px; margin-bottom:8px;">자동로그인 세션이 만료되었거나 비로그인 상태입니다.</p>
      ${debugInfo ? `<p style="color:#bbb; font-size:10px; word-break:break-all; margin-bottom:8px; text-align:left; background:#f5f5f5; padding:6px; border-radius:3px;">${debugInfo}</p>` : ''}
      <a href="https://chzzk.naver.com" target="_blank" style="color:#00c73c; text-decoration:underline; font-weight:bold;">치지직 홈 열기</a>
    </div>
  `;
}

// ==========================================
// 6. 팔로잉 목록 렌더링 (이름순 / 라이브 뱃지 / 즐겨찾기·추가 버튼)
// ==========================================
function renderFollowingApiList(followList) {
  followingApiListDiv.innerHTML = '';

  if (followList.length === 0) {
    followingApiListDiv.innerHTML = '<p style="color:#999; text-align:center; padding:20px; font-size:12px;">팔로우 중인 스트리머가 없습니다.</p>';
    return;
  }

  // 라이브 우선, 같은 상태면 이름 가나다순 정렬
  followList.sort((a, b) => {
    const aLive = a.openLive ?? a.streamer?.openLive ?? false;
    const bLive = b.openLive ?? b.streamer?.openLive ?? false;
    if (aLive !== bLive) return bLive ? 1 : -1;
    const aName = a.channelName ?? a.channel?.channelName ?? '';
    const bName = b.channelName ?? b.channel?.channelName ?? '';
    return aName.localeCompare(bName, 'ko');
  });

  const liveCount = followList.filter(item => item.streamer?.openLive).length;

  const header = document.createElement('div');
  header.style.cssText = 'padding:0 2px 6px; font-size:11px; color:#999; border-bottom:1px solid #eee; margin-bottom:2px;';
  header.textContent = `총 ${followList.length}명 팔로잉 · LIVE ${liveCount}명`;
  followingApiListDiv.appendChild(header);

  chrome.storage.local.get(['currentViewList', 'favoriteMasterList'], (result) => {
    const currentList  = result.currentViewList    || [];
    const favoriteList = result.favoriteMasterList || [];

    followList.forEach(item => {
      // 평탄(flat) 구조: { channelId, channelName, openLive, ... }
      // 중첩(nested) 구조: { channel: { channelId, channelName }, streamer: { openLive } }
      const channelId   = item.channelId   ?? item.channel?.channelId;
      const channelName = item.channelName ?? item.channel?.channelName;
      const isLive      = item.openLive    ?? item.streamer?.openLive ?? false;
      if (!channelId || !channelName) return;
      const inCurrent   = currentList.some(s  => s.channelId === channelId);
      const inFavorite  = favoriteList.some(s => s.channelId === channelId);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 2px; border-bottom:1px solid #f2f2f2; font-size:12px;';

      // 왼쪽: 이름 + LIVE/OFF 뱃지
      const leftGroup = document.createElement('div');
      leftGroup.style.cssText = 'display:flex; align-items:center; gap:5px; overflow:hidden; flex:1; min-width:0;';

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
      nameSpan.textContent = channelName;

      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:9px; padding:1px 4px; border-radius:3px; font-weight:bold; flex-shrink:0;';
      if (isLive) {
        badge.textContent = 'LIVE';
        badge.style.cssText += 'background:#e50914; color:#fff;';
      } else {
        badge.textContent = 'OFF';
        badge.style.cssText += 'background:#e1e4e6; color:#767c82;';
      }

      leftGroup.appendChild(nameSpan);
      leftGroup.appendChild(badge);
      row.appendChild(leftGroup);

      // 오른쪽: 즐겨찾기 + 시청 추가 버튼
      const rightGroup = document.createElement('div');
      rightGroup.style.cssText = 'display:flex; gap:4px; flex-shrink:0; margin-left:6px;';

      const btnFav = document.createElement('button');
      btnFav.textContent = inFavorite ? '★ 저장됨' : '☆ 즐겨찾기';
      setMiniButtonStyle(btnFav, inFavorite ? '#e6a817' : '#6c757d');
      btnFav.disabled = inFavorite;
      btnFav.addEventListener('click', () => {
        chrome.storage.local.get(['favoriteMasterList'], (res) => {
          const list = res.favoriteMasterList || [];
          if (list.some(s => s.channelId === channelId)) return;
          list.push({ channelId, name: channelName });
          chrome.storage.local.set({ favoriteMasterList: list }, () => {
            btnFav.textContent = '★ 저장됨';
            btnFav.style.backgroundColor = '#e6a817';
            btnFav.disabled = true;
            loadAndRenderData();
          });
        });
      });

      const btnAdd = document.createElement('button');
      btnAdd.textContent = inCurrent ? '추가됨' : '+ 시청';
      setMiniButtonStyle(btnAdd, inCurrent ? '#bbb' : '#00c73c');
      btnAdd.disabled = inCurrent;
      btnAdd.addEventListener('click', () => {
        chrome.storage.local.get(['currentViewList'], (res) => {
          const list = res.currentViewList || [];
          if (list.some(s => s.channelId === channelId)) return;
          list.push({ channelId, name: channelName });
          chrome.storage.local.set({ currentViewList: list }, () => {
            btnAdd.textContent = '추가됨';
            btnAdd.style.backgroundColor = '#bbb';
            btnAdd.disabled = true;
            loadAndRenderData();
          });
        });
      });

      rightGroup.appendChild(btnFav);
      rightGroup.appendChild(btnAdd);
      row.appendChild(rightGroup);
      followingApiListDiv.appendChild(row);
    });
  });
}

function saveSettings() {
  const systemSettings = {
    isAutoSync: chkAutoSync ? chkAutoSync.checked : true,
    limitSeconds: numLimitSeconds ? (parseInt(numLimitSeconds.value, 10) || 10) : 10
  };
  chrome.storage.local.set({ systemSettings });
}