// ── 치지직 로그인 상태 확인 및 UI 표시 ──
function checkLoginStatus() {
  Promise.all([
    chrome.cookies.get({ url: 'https://chzzk.naver.com/', name: 'NID_AUT' }),
    chrome.cookies.get({ url: 'https://chzzk.naver.com/', name: 'NID_SES' })
  ]).then(([nidAut, nidSes]) => {
    const isLoggedIn = !!nidAut && !!nidSes;
    if (btnLoadFollowing) btnLoadFollowing.style.display = isLoggedIn ? '' : 'none';
    if (loginRequiredGuide) loginRequiredGuide.style.display = isLoggedIn ? 'none' : 'block';
  });
}

// ── SOOP 로그인 상태 확인 및 UI 표시 ──
function checkSoopLoginStatus() {
  chrome.runtime.sendMessage({ action: 'checkSoopLogin' }, (response) => {
    const isLoggedIn = response?.loggedIn === true;
    if (btnLoadSoopFollowing) btnLoadSoopFollowing.style.display = isLoggedIn ? '' : 'none';
    if (soopLoginRequiredGuide) soopLoginRequiredGuide.style.display = isLoggedIn ? 'none' : 'block';
  });
}

// ── SOOP 팔로잉 목록 렌더링 ──
function renderSoopFollowingList(streamerList) {
  soopFollowingApiListDiv.innerHTML = '';

  if (streamerList.length === 0) {
    soopFollowingApiListDiv.innerHTML = '<p style="color:#999; text-align:center; padding:20px; font-size:12px;">팔로우 중인 스트리머가 없습니다.</p>';
    return;
  }

  streamerList.sort((a, b) => {
    if (a.is_live !== b.is_live) return b.is_live ? 1 : -1;
    return (a.user_nick || '').localeCompare(b.user_nick || '', 'ko');
  });

  const liveCount = streamerList.filter(item => item.is_live).length;

  const header = document.createElement('div');
  header.style.cssText = 'padding:0 2px 6px; font-size:11px; color:#999; border-bottom:1px solid #eee; margin-bottom:2px;';
  header.textContent = `총 ${streamerList.length}명 팔로잉 · LIVE ${liveCount}명`;
  soopFollowingApiListDiv.appendChild(header);

  chrome.storage.local.get(['currentViewList'], (result) => {
    const currentList = result.currentViewList || [];

    getFavoriteTree((tree) => {
      const allFavIds = collectAllChannelIds(tree);

      streamerList.forEach(item => {
        const channelId   = item.user_id;
        const channelName = item.user_nick;
        const isLive      = item.is_live === true;
        if (!channelId || !channelName) return;

        const inCurrent  = currentList.some(s => s.channelId === channelId && s.platform === 'soop');
        const inFavorite = allFavIds.has(channelId);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 2px; border-bottom:1px solid #f2f2f2; font-size:12px;';

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

        leftGroup.appendChild(badge);
        leftGroup.appendChild(nameSpan);
        row.appendChild(leftGroup);

        const rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex; gap:4px; flex-shrink:0; margin-left:6px;';

        const btnFav = document.createElement('button');
        btnFav.textContent = inFavorite ? '★ 즐겨찾기' : '☆ 즐겨찾기';
        setMiniButtonStyle(btnFav, inFavorite ? '#e6a817' : '#bbb');
        btnFav.disabled = inFavorite;
        btnFav.addEventListener('click', () => {
          getFavoriteTree((t) => {
            const ids = collectAllChannelIds(t);
            if (ids.has(channelId)) return;
            t.items.push({ channelId, name: channelName, platform: 'soop' });
            saveFavoriteTree(t, () => {
              btnFav.textContent = '★ 즐겨찾기';
              btnFav.style.backgroundColor = '#e6a817';
              btnFav.disabled = true;
              loadAndRenderData();
            });
          });
        });

        const btnAdd = document.createElement('button');
        btnAdd.textContent = inCurrent ? '추가됨' : '+ 시청';
        setMiniButtonStyle(btnAdd, inCurrent ? '#bbb' : '#3B9ED6');
        btnAdd.disabled = inCurrent;
        btnAdd.addEventListener('click', () => {
          chrome.storage.local.get(['currentViewList'], (res) => {
            const list = res.currentViewList || [];
            if (list.some(s => s.channelId === channelId && s.platform === 'soop')) return;
            list.push({ channelId, name: channelName, platform: 'soop' });
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
        soopFollowingApiListDiv.appendChild(row);
      });
    });
  });
}

// ── SOOP 팔로잉 목록 불러오기 이벤트 ──
function initSoopFollowingEvents() {
  checkSoopLoginStatus();

  if (linkGoSoopLogin) {
    linkGoSoopLogin.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://www.sooplive.com' });
      window.close();
    });
  }

  if (!btnLoadSoopFollowing) return;
  btnLoadSoopFollowing.addEventListener('click', () => {
    soopFollowingSyncContainer.style.display = 'block';
    soopFollowingApiListDiv.innerHTML = '<p style="color:#666; text-align:center; padding:20px; font-size:12px;">SOOP 팔로잉 목록 조회 중...</p>';

    chrome.runtime.sendMessage({ action: 'fetchFollowingList', platform: 'soop' }, (response) => {
      if (chrome.runtime.lastError) {
        soopFollowingApiListDiv.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px; font-size:12px;">런타임 오류: ${chrome.runtime.lastError.message}</p>`;
        return;
      }
      if (!response?.success) {
        soopFollowingApiListDiv.innerHTML = `<p style="color:#dc3545; text-align:center; padding:20px; font-size:12px;">불러오기 실패: ${response?.error || '알 수 없는 오류'}</p>`;
        return;
      }
      const streamerList = response.data?.data;
      if (!Array.isArray(streamerList)) {
        soopFollowingApiListDiv.innerHTML = '<p style="color:#dc3545; text-align:center; padding:20px; font-size:12px;">응답 구조 불일치</p>';
        return;
      }
      renderSoopFollowingList(streamerList);
    });
  });
}

// ── 치지직 팔로잉 목록 불러오기 이벤트 ──
function initFollowingEvents() {
  checkLoginStatus();

  if (linkGoLogin) {
    linkGoLogin.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://chzzk.naver.com' });
      window.close();
    });
  }

  if (!btnLoadFollowing) return;
  btnLoadFollowing.addEventListener('click', () => {
    followingSyncContainer.style.display = 'block';
    followingApiListDiv.innerHTML = '<p style="color:#666; text-align:center; padding:20px; font-size:12px;">치지직 팔로잉 목록 조회 중...</p>';

    chrome.runtime.sendMessage({ action: "fetchFollowingList", platform: 'chzzk' }, (response) => {
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

      let followList = data.content.followingList
        || data.content.followings
        || data.content.data
        || data.content.list
        || data.content.channels
        || data.content.channelList;

      if (!Array.isArray(followList)) {
        followList = Object.values(data.content).find(v => Array.isArray(v));
      }
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

// ── 오류 UI ──
function showErrorUI(debugInfo) {
  followingApiListDiv.innerHTML = `
    <div style="text-align:center; padding:16px; font-size:12px; color:#555;">
      <p style="color:#dc3545; font-weight:bold; margin-bottom:6px;">불러오기 실패</p>
      <p style="color:#999; font-size:11px; margin-bottom:8px;">자동로그인 세션이 만료되었거나 비로그인 상태입니다.</p>
      ${debugInfo ? `<p style="color:#bbb; font-size:10px; word-break:break-all; margin-bottom:8px; text-align:left; background:#f5f5f5; padding:6px; border-radius:3px;">${debugInfo}</p>` : ''}
      <a href="https://chzzk.naver.com" target="_blank" style="color:#3B9ED6; text-decoration:underline; font-weight:bold;">치지직 홈 열기</a>
    </div>
  `;
}

// ── 팔로잉 목록 렌더링 ──
function renderFollowingApiList(followList) {
  followingApiListDiv.innerHTML = '';

  if (followList.length === 0) {
    followingApiListDiv.innerHTML = '<p style="color:#999; text-align:center; padding:20px; font-size:12px;">팔로우 중인 스트리머가 없습니다.</p>';
    return;
  }

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

  chrome.storage.local.get(['currentViewList'], (result) => {
    const currentList = result.currentViewList || [];

    getFavoriteTree((tree) => {
      const allFavIds = collectAllChannelIds(tree);

      followList.forEach(item => {
        const channelId   = item.channelId   ?? item.channel?.channelId;
        const channelName = item.channelName ?? item.channel?.channelName;
        const isLive      = item.openLive    ?? item.streamer?.openLive ?? false;
        if (!channelId || !channelName) return;

        const inCurrent  = currentList.some(s => s.channelId === channelId);
        const inFavorite = allFavIds.has(channelId);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 2px; border-bottom:1px solid #f2f2f2; font-size:12px;';

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

        leftGroup.appendChild(badge);
        leftGroup.appendChild(nameSpan);
        row.appendChild(leftGroup);

        const rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex; gap:4px; flex-shrink:0; margin-left:6px;';

        const btnFav = document.createElement('button');
        btnFav.textContent = inFavorite ? '★ 즐겨찾기' : '☆ 즐겨찾기';
        setMiniButtonStyle(btnFav, inFavorite ? '#e6a817' : '#bbb');
        btnFav.disabled = inFavorite;
        btnFav.addEventListener('click', () => {
          getFavoriteTree((t) => {
            const ids = collectAllChannelIds(t);
            if (ids.has(channelId)) return;
            t.items.push({ channelId, name: channelName });
            saveFavoriteTree(t, () => {
              btnFav.textContent = '★ 즐겨찾기';
              btnFav.style.backgroundColor = '#e6a817';
              btnFav.disabled = true;
              loadAndRenderData();
            });
          });
        });

        const btnAdd = document.createElement('button');
        btnAdd.textContent = inCurrent ? '추가됨' : '+ 시청';
        setMiniButtonStyle(btnAdd, inCurrent ? '#bbb' : '#3B9ED6');
        btnAdd.disabled = inCurrent;
        btnAdd.addEventListener('click', () => {
          chrome.storage.local.get(['currentViewList'], (res) => {
            const list = res.currentViewList || [];
            if (list.some(s => s.channelId === channelId)) return;
            list.push({ channelId, name: channelName, platform: 'chzzk' });
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
  });
}
