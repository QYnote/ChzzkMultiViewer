// ── 저장된 목록 화면 ──
// 오른쪽 `저장 목록` 화면을 그리고, 목록 저장(왼쪽 위)과 받은 글 불러오기(채널 추가 화면)를 다룬다.
// 화면 요소를 스스로 찾아 쓰므로 다른 파일의 변수에 기대지 않는다.

var savedListContainer = document.getElementById('saved-list-container');
var savedListFormArea  = document.getElementById('saved-list-form');
var btnSaveCurrentList = document.getElementById('btn-save-current-list');
var inputImportText    = document.getElementById('input-import-text');
var btnImportConfirm   = document.getElementById('btn-import-confirm');

// 방금 붙여넣기로 불러온 목록의 이름. 이어서 저장할 때 기본값으로 채워 준다.
// 받은 사람이 이름을 다시 타이핑하지 않아도 되게 하기 위해서다.
var lastLoadedListName = '';

// ── 목록 그리기 ──
function renderSavedLists() {
  if (!savedListContainer) return;
  getSavedLists((lists) => {
    savedListContainer.innerHTML = '';
    if (lists.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'color:#999; text-align:center; margin-top:60px; font-size:12px;';
      empty.textContent = '저장된 목록이 없습니다.';
      savedListContainer.appendChild(empty);
      return;
    }
    lists.forEach(list => savedListContainer.appendChild(createSavedListRow(list)));
  });
}

function createSavedListRow(list) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'border-bottom:1px solid #f0f0f0; padding:5px 2px;';

  // 첫 줄 — 펼침 화살표 · 이름 · 채널 수
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; align-items:center; gap:4px;';

  const detail = document.createElement('div');
  detail.style.cssText = 'display:none; padding:4px 0 2px 16px;';

  const btnToggle = document.createElement('button');
  btnToggle.textContent = '▶';
  btnToggle.style.cssText = 'background:none; border:none; cursor:pointer; font-size:9px; color:#888; width:auto; padding:0 2px;';
  btnToggle.addEventListener('click', () => {
    const opened = detail.style.display !== 'none';
    detail.style.display = opened ? 'none' : 'block';
    btnToggle.textContent = opened ? '▶' : '▼';
  });

  const nameEl = document.createElement('strong');
  nameEl.style.cssText = 'flex:1; min-width:0; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  nameEl.textContent = list.name;
  nameEl.title = '3번 클릭하면 이름을 바꿉니다';
  nameEl.addEventListener('click', (e) => {
    if (e.detail === 3) startRenameSavedList(nameEl, list.name);
  });

  const countEl = document.createElement('span');
  countEl.style.cssText = 'font-size:10px; color:#888; flex-shrink:0;';
  countEl.textContent = `${list.channels.length}개`;

  head.appendChild(btnToggle);
  head.appendChild(nameEl);
  head.appendChild(countEl);

  // 둘째 줄 — 조작 버튼. 칸이 좁아 이름과 같은 줄에 두지 않는다.
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex; gap:3px; margin:4px 0 0 16px;';

  const btnLoad = document.createElement('button');
  btnLoad.textContent = '불러오기';
  setMiniButtonStyle(btnLoad, '#3B9ED6');
  btnLoad.style.padding = '2px 6px';
  btnLoad.addEventListener('click', () => loadSavedList(list));

  const btnShare = document.createElement('button');
  btnShare.textContent = '공유';
  setMiniButtonStyle(btnShare, '#5A8FAA');
  btnShare.style.padding = '2px 6px';
  btnShare.addEventListener('click', () => shareSavedList(list));

  const btnDel = document.createElement('button');
  btnDel.textContent = '삭제';
  setMiniButtonStyle(btnDel, '#dc3545');
  btnDel.style.padding = '2px 6px';
  btnDel.addEventListener('click', () => {
    if (!confirm(`"${list.name}" 목록을 삭제합니다.\n계속하시겠습니까?`)) return;
    deleteSavedList(list.name, () => {
      showToast('목록을 삭제했습니다.', 'success');
      renderSavedLists();
    });
  });

  btnGroup.appendChild(btnLoad);
  btnGroup.appendChild(btnShare);
  btnGroup.appendChild(btnDel);

  // 펼쳤을 때 보이는 채널들 (보기 전용)
  if (list.channels.length === 0) {
    const none = document.createElement('p');
    none.style.cssText = 'margin:0; font-size:10px; color:#999;';
    none.textContent = '담긴 채널이 없습니다.';
    detail.appendChild(none);
  } else {
    list.channels.forEach((ch) => {
      const line = document.createElement('div');
      line.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:10px; color:#555; padding:1px 0;';
      const icon = document.createElement('img');
      icon.className = 'platform-icon';
      icon.src = (ch.platform === 'soop') ? 'resources/soop_icon_16.jpg' : 'resources/chzzk_icon_16.jpg';
      icon.alt = '';
      const label = document.createElement('span');
      label.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      label.textContent = ch.name;
      line.appendChild(icon);
      line.appendChild(label);
      detail.appendChild(line);
    });
  }

  wrap.appendChild(head);
  wrap.appendChild(btnGroup);
  wrap.appendChild(detail);
  return wrap;
}

// ── 이름 바꾸기 (채널 즐겨찾기 폴더와 같은 방식) ──
function startRenameSavedList(nameEl, oldName) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = oldName;
  input.style.cssText = 'flex:1; min-width:0; font-size:11px; font-weight:bold; border:1px solid #aaa; border-radius:2px; padding:1px 3px;';
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (!save || value === '' || value === oldName) {
      input.replaceWith(nameEl);
      return;
    }
    renameSavedList(oldName, value, (ok) => {
      if (!ok) showToast('같은 이름의 목록이 이미 있습니다.', 'error');
      renderSavedLists();
    });
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ── 불러오기 (덮어쓰기) ──
function loadSavedList(list) {
  if (list.channels.length === 0) {
    showToast('담긴 채널이 없어 불러올 수 없습니다.', 'error');
    return;
  }
  const message = `"${list.name}" 조합으로 갈아탑니다.\n`
    + `지금 시청 목록은 사라지고, 대시보드가 열려 있으면 보던 방송이 다시 시작됩니다.\n`
    + `계속하시겠습니까?`;
  if (!confirm(message)) return;

  replaceCurrentView(list.channels, () => {
    lastLoadedListName = list.name;
    loadAndRenderData();
    showToast(`"${list.name}"을(를) 불러왔습니다.`, 'success');
  });
}

// ── 공유 (클립보드로 복사) ──
function shareSavedList(list) {
  const text = buildShareText(list.name, list.channels);
  navigator.clipboard.writeText(text)
    .then(() => showToast('공유할 글을 복사했습니다.', 'success'))
    .catch(() => showToast('복사하지 못했습니다.', 'error'));
}

// ── 상단 폼 (저장 / 붙여넣기) ──
function closeSavedListForm() {
  if (!savedListFormArea) return;
  savedListFormArea.innerHTML = '';
  savedListFormArea.style.display = 'none';
}

function openSavedListForm(build) {
  if (!savedListFormArea) return;
  savedListFormArea.innerHTML = '';
  savedListFormArea.style.display = 'block';
  build(savedListFormArea);
}

function openSaveCurrentForm() {
  chrome.storage.local.get(['currentViewList'], (result) => {
    const currentList = result.currentViewList || [];
    if (currentList.length === 0) {
      showToast('시청 목록이 비어 있어 저장할 것이 없습니다.', 'error');
      return;
    }

    openSavedListForm((area) => {
      // 이름 입력과 두 버튼을 한 줄에 둔다. 이 폼이 열리면 아래 목록이 밀리는데,
      // 두 줄이면 팝업이 브라우저가 허용하는 높이를 넘어 전체가 스크롤된다.
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; gap:3px;';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '목록 이름';
      input.value = lastLoadedListName;
      input.style.cssText = 'flex:1; min-width:0; font-size:11px; padding:3px 5px; border:1px solid var(--clr-border); border-radius:3px; box-sizing:border-box;';

      const submit = () => {
        const name = input.value.trim();
        if (name === '') { showToast('목록 이름을 입력해 주세요.', 'error'); return; }
        getSavedLists((lists) => {
          if (lists.some(l => l.name === name)
              && !confirm(`"${name}" 목록이 이미 있습니다.\n덮어쓰시겠습니까?`)) return;
          saveCurrentViewAsList(name, (count) => {
            closeSavedListForm();
            renderSavedLists();
            showToast(`"${name}"에 ${count}개를 저장했습니다.`, 'success');
          });
        });
      };

      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

      const btnOk = document.createElement('button');
      btnOk.textContent = '저장';
      setMiniButtonStyle(btnOk, '#3B9ED6');
      btnOk.style.flexShrink = '0';
      btnOk.addEventListener('click', submit);

      const btnCancel = document.createElement('button');
      btnCancel.textContent = '취소';
      setMiniButtonStyle(btnCancel, '#868e96');
      btnCancel.style.flexShrink = '0';
      btnCancel.addEventListener('click', closeSavedListForm);

      row.appendChild(input);
      row.appendChild(btnOk);
      row.appendChild(btnCancel);
      area.appendChild(row);
      input.focus();
      input.select();
    });
  });
}

// ── 받은 글로 갈아타기 ──
// 입력창이 채널 추가 화면에 늘 보이므로 여는 단계 없이 바로 읽는다.
function importFromText() {
  if (!inputImportText) return;

  const parsed = parseShareText(inputImportText.value);
  if (!parsed) {
    showToast('이 프로그램의 공유 글이 아닙니다.', 'error');
    return;
  }
  if (parsed.channels.length === 0) {
    showToast('읽을 수 있는 채널이 없습니다.', 'error');
    return;
  }

  const title = parsed.name || '받은 목록';
  let message = `"${title}" 조합으로 갈아탑니다. (채널 ${parsed.channels.length}개)\n`;
  if (parsed.skipped > 0) message += `읽지 못한 줄 ${parsed.skipped}개는 건너뜁니다.\n`;
  message += `지금 시청 목록은 사라지고, 대시보드가 열려 있으면 보던 방송이 다시 시작됩니다.\n`
    + `계속하시겠습니까?`;
  if (!confirm(message)) return;

  replaceCurrentView(parsed.channels, () => {
    lastLoadedListName = title;
    inputImportText.value = '';
    loadAndRenderData();
    showToast(`${parsed.channels.length}개를 불러왔습니다.`, 'success');
  });
}

// ── 이벤트 연결 ──
function initSavedListEvents() {
  if (btnSaveCurrentList) btnSaveCurrentList.addEventListener('click', openSaveCurrentForm);
  if (btnImportConfirm)   btnImportConfirm.addEventListener('click', importFromText);
}
