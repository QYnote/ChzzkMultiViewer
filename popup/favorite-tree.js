// ── 폴더 ID 생성 ──
function generateFolderId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ── 트리에서 모든 channelId 수집 ──
function collectAllChannelIds(node) {
  const ids = new Set((node.items || []).map(i => i.channelId));
  (node.folders || []).forEach(f => collectAllChannelIds(f).forEach(id => ids.add(id)));
  return ids;
}

// ── ID로 폴더 노드 탐색 ──
function findFolderNode(node, id) {
  if (node.id === id) return node;
  for (const f of (node.folders || [])) {
    const found = findFolderNode(f, id);
    if (found) return found;
  }
  return null;
}

// ── 폴더의 부모 노드 탐색 ──
function findParentOfFolder(node, folderId) {
  for (const f of (node.folders || [])) {
    if (f.id === folderId) return node;
    const found = findParentOfFolder(f, folderId);
    if (found) return found;
  }
  return null;
}

// ── 트리에서 항목 제거 ──
function removeItemFromTree(node, channelId) {
  node.items = (node.items || []).filter(i => i.channelId !== channelId);
  (node.folders || []).forEach(f => removeItemFromTree(f, channelId));
}

// ── 트리에서 폴더 채취 (제거 후 반환) ──
function extractFolderFromTree(node, folderId) {
  const idx = (node.folders || []).findIndex(f => f.id === folderId);
  if (idx !== -1) return node.folders.splice(idx, 1)[0];
  for (const f of (node.folders || [])) {
    const found = extractFolderFromTree(f, folderId);
    if (found) return found;
  }
  return null;
}

// ── 트리에서 폴더 제거 (하위 포함 일괄 삭제) ──
function removeFolderFromTree(node, folderId) {
  const idx = (node.folders || []).findIndex(f => f.id === folderId);
  if (idx !== -1) { node.folders.splice(idx, 1); return true; }
  for (const f of (node.folders || [])) {
    if (removeFolderFromTree(f, folderId)) return true;
  }
  return false;
}

// ── 드래그 상태 ──
let dragState = null;
// { type: 'item', channelId, name, sourceFolderId }
// { type: 'folder', folderId, sourceParentId }

// ── 드롭 위치 판별 (마우스 Y 기준 상반=before / 하반=after) ──
function getDropPos(e, el) {
  const rect = el.getBoundingClientRect();
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
}

// ── 삽입 인디케이터 스타일 ──
function setInsertLine(el, pos) {
  el.style.borderTop    = pos === 'before' ? '2px solid #00c73c' : '';
  el.style.borderBottom = pos === 'after'  ? '2px solid #00c73c' : '';
}
function clearInsertLine(el) {
  el.style.borderTop = '';
  el.style.borderBottom = '';
}

// ── 폴더 이름 인라인 편집 ──
function startFolderRename(nameEl, folder, tree) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = folder.name;
  input.style.flex = '1';
  input.style.minWidth = '0';
  input.style.fontSize = '11px';
  input.style.fontWeight = 'bold';
  input.style.border = '1px solid #aaa';
  input.style.borderRadius = '2px';
  input.style.padding = '1px 3px';
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  const finish = (save) => {
    if (save) {
      const v = input.value.trim();
      if (v) folder.name = v;
    }
    nameEl.textContent = '📁 ' + folder.name;
    input.replaceWith(nameEl);
    if (save) saveFavoriteTree(tree, () => {});
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
}

// ── 항목 행 생성 ──
function createFavoriteItemRow(item, folderId, depth, tree, container, currentList) {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.padding = `3px 4px 3px ${depth * 14 + 8}px`;
  row.style.borderBottom = '1px solid #eee';
  row.style.fontSize = '12px';
  row.style.cursor = 'grab';
  row.draggable = true;

  row.addEventListener('dragstart', (e) => {
    const inferredPlatform = item.platform || (/^[0-9a-f]{32}$/i.test(item.channelId) ? 'chzzk' : 'soop');
    dragState = { type: 'item', channelId: item.channelId, name: item.name, platform: inferredPlatform, sourceFolderId: folderId };
    setTimeout(() => { row.style.opacity = '0.4'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });
  row.addEventListener('dragend', () => {
    dragState = null;
    row.style.opacity = '';
    clearInsertLine(row);
  });

  // 같은 폴더 내 항목 재정렬 드롭 타겟
  row.addEventListener('dragover', (e) => {
    if (!dragState || dragState.type !== 'item') return;
    if (dragState.sourceFolderId !== folderId) return; // 다른 폴더면 폴더 헤더로 유도
    if (dragState.channelId === item.channelId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setInsertLine(row, getDropPos(e, row));
  });
  row.addEventListener('dragleave', () => clearInsertLine(row));
  row.addEventListener('drop', (e) => {
    e.preventDefault();
    const pos = getDropPos(e, row);
    clearInsertLine(row);
    if (!dragState || dragState.type !== 'item') return;
    if (dragState.sourceFolderId !== folderId || dragState.channelId === item.channelId) return;

    const folder = findFolderNode(tree, folderId);
    if (!folder) return;
    const fromIdx = folder.items.findIndex(i => i.channelId === dragState.channelId);
    if (fromIdx === -1) return;
    const [moved] = folder.items.splice(fromIdx, 1);
    const toIdx = folder.items.findIndex(i => i.channelId === item.channelId);
    folder.items.splice(pos === 'before' ? toIdx : toIdx + 1, 0, moved);
    dragState = null;
    saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
  });

  const left = document.createElement('div');
  left.style.cssText = 'display:flex; align-items:center; gap:4px; flex:1; min-width:0; overflow:hidden;';

  const nameEl = document.createElement('strong');
  nameEl.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  nameEl.textContent = item.name;

  const liveBadge = document.createElement('span');
  liveBadge.style.cssText = 'font-size:9px; padding:1px 4px; border-radius:3px; font-weight:bold; flex-shrink:0; visibility:hidden;';
  liveBadge.textContent = 'OFF';
  const itemPlatform = item.platform || (/^[0-9a-f]{32}$/i.test(item.channelId) ? 'chzzk' : 'soop');
  chrome.runtime.sendMessage({ action: 'fetchChannelLiveStatus', channelId: item.channelId, platform: itemPlatform }, (response) => {
    if (!response?.success || response.openLive == null) return;
    liveBadge.style.visibility = 'visible';
    if (response.openLive) {
      liveBadge.textContent = 'LIVE';
      liveBadge.style.background = '#e50914';
      liveBadge.style.color = '#fff';
    } else {
      liveBadge.textContent = 'OFF';
      liveBadge.style.background = '#e1e4e6';
      liveBadge.style.color = '#767c82';
    }
  });

  left.appendChild(nameEl);
  left.appendChild(liveBadge);

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex; gap:2px; flex-shrink:0;';

  const inCurrent = (currentList || []).some(s => s.channelId === item.channelId);
  const btnCopy = document.createElement('button');
  btnCopy.textContent = inCurrent ? '추가됨' : '+ 시청';
  setMiniButtonStyle(btnCopy, inCurrent ? '#bbb' : '#00c73c');
  btnCopy.disabled = inCurrent;
  btnCopy.style.padding = '2px 6px';
  if (!inCurrent) {
    btnCopy.addEventListener('click', () => copyToCurrentView(item));
  }

  const btnDel = document.createElement('button');
  btnDel.textContent = '삭제';
  setMiniButtonStyle(btnDel, '#dc3545');
  btnDel.style.padding = '2px 6px';
  btnDel.addEventListener('click', () => {
    removeItemFromTree(tree, item.channelId);
    saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
  });

  btnGroup.appendChild(btnCopy);
  btnGroup.appendChild(btnDel);
  row.appendChild(left);
  row.appendChild(btnGroup);
  return row;
}

// ── 폴더 노드 렌더링 (재귀) ──
function renderFolderNode(container, folder, depth, tree, currentList, isRoot) {
  const indentPx = depth * 14 + 4;

  if (!isRoot) {
    const defaultBg = '#f8f8f8';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.padding = `4px 6px 4px ${indentPx}px`;
    header.style.background = defaultBg;
    header.style.borderBottom = '1px solid #ddd';
    header.style.fontSize = '11px';
    header.style.fontWeight = 'bold';
    header.style.userSelect = 'none';
    header.draggable = true;

    // 폴더 헤더 드래그 (폴더 순서 변경용)
    header.addEventListener('dragstart', (e) => {
      const parentNode = findParentOfFolder(tree, folder.id) || tree;
      dragState = { type: 'folder', folderId: folder.id, sourceParentId: parentNode.id };
      setTimeout(() => { header.style.opacity = '0.4'; }, 0);
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    });
    header.addEventListener('dragend', () => {
      dragState = null;
      header.style.opacity = '';
      clearInsertLine(header);
    });

    // 폴더 헤더 드롭 타겟 (항목 이동 + 폴더 재정렬)
    header.addEventListener('dragover', (e) => {
      if (!dragState) return;
      if (dragState.type === 'item' && dragState.sourceFolderId !== folder.id) {
        // 항목 → 이 폴더로 이동
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        header.style.background = '#e0f5e8';
        header.style.outline = '1px dashed #00c73c';
        clearInsertLine(header);
      } else if (dragState.type === 'folder' && dragState.folderId !== folder.id) {
        // 폴더 → 같은 레벨 재정렬
        const parentOfDrag   = findParentOfFolder(tree, dragState.folderId) || tree;
        const parentOfTarget = findParentOfFolder(tree, folder.id) || tree;
        if (parentOfDrag.id !== parentOfTarget.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        header.style.background = defaultBg;
        header.style.outline = '';
        setInsertLine(header, getDropPos(e, header));
      }
    });
    header.addEventListener('dragleave', () => {
      header.style.background = defaultBg;
      header.style.outline = '';
      clearInsertLine(header);
    });
    header.addEventListener('drop', (e) => {
      e.preventDefault();
      header.style.background = defaultBg;
      header.style.outline = '';
      clearInsertLine(header);
      if (!dragState) return;

      if (dragState.type === 'item' && dragState.sourceFolderId !== folder.id) {
        // 항목 이동
        removeItemFromTree(tree, dragState.channelId);
        const target = findFolderNode(tree, folder.id);
        if (!target) return;
        if (!target.items) target.items = [];
        target.items.push({ channelId: dragState.channelId, name: dragState.name, platform: dragState.platform });
        dragState = null;
        saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));

      } else if (dragState.type === 'folder' && dragState.folderId !== folder.id) {
        // 폴더 재정렬
        const parentOfDrag   = findParentOfFolder(tree, dragState.folderId) || tree;
        const parentOfTarget = findParentOfFolder(tree, folder.id) || tree;
        if (parentOfDrag.id !== parentOfTarget.id) return;
        const pos    = getDropPos(e, header);
        const parent = parentOfTarget;
        const moved  = extractFolderFromTree(tree, dragState.folderId);
        if (!moved) return;
        const toIdx = (parent.folders || []).findIndex(f => f.id === folder.id);
        if (toIdx === -1) { parent.folders.push(moved); }
        else { parent.folders.splice(pos === 'before' ? toIdx : toIdx + 1, 0, moved); }
        dragState = null;
        saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
      }
    });

    // ▶/▼ 화살표 (접기/펼치기)
    const arrow = document.createElement('span');
    arrow.style.cssText = 'flex-shrink:0; width:12px; font-size:9px; cursor:pointer; margin-right:2px;';
    arrow.textContent = folder.collapsed ? '▶' : '▼';
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      folder.collapsed = !folder.collapsed;
      saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
    });

    // 폴더명 (3번 클릭 시 이름 변경)
    const nameEl = document.createElement('span');
    nameEl.style.cssText = 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer;';
    nameEl.textContent = '📁 ' + folder.name;

    let nameClickCount = 0;
    let nameClickTimer = null;
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      nameClickCount++;
      if (nameClickCount >= 3) {
        nameClickCount = 0;
        clearTimeout(nameClickTimer);
        nameClickTimer = null;
        startFolderRename(nameEl, folder, tree);
        return;
      }
      clearTimeout(nameClickTimer);
      nameClickTimer = setTimeout(() => {
        nameClickCount = 0;
        nameClickTimer = null;
      }, 400);
    });

    const btnAddSub = document.createElement('button');
    btnAddSub.textContent = '+ 폴더';
    setMiniButtonStyle(btnAddSub, '#868e96');
    btnAddSub.style.padding = '1px 5px';
    btnAddSub.style.fontSize = '10px';
    btnAddSub.style.marginLeft = '4px';
    btnAddSub.addEventListener('mousedown', (e) => e.stopPropagation()); // 드래그 방지
    btnAddSub.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = findFolderNode(tree, folder.id);
      if (!parent) return;
      if (!parent.folders) parent.folders = [];
      parent.folders.push({ id: generateFolderId(), name: '새 폴더', items: [], folders: [], collapsed: false });
      saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
    });

    const btnDel = document.createElement('button');
    btnDel.textContent = '삭제';
    setMiniButtonStyle(btnDel, '#6c757d');
    btnDel.style.padding = '1px 5px';
    btnDel.style.fontSize = '10px';
    btnDel.style.marginLeft = '2px';
    btnDel.addEventListener('mousedown', (e) => e.stopPropagation()); // 드래그 방지
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      const hasContent = (folder.items || []).length > 0 || (folder.folders || []).length > 0;
      if (hasContent && !confirm(`"${folder.name}" 폴더 안의 모든 항목이 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
      removeFolderFromTree(tree, folder.id);
      saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
    });

    header.appendChild(arrow);
    header.appendChild(nameEl);
    header.appendChild(btnAddSub);
    header.appendChild(btnDel);
    container.appendChild(header);
    if (folder.collapsed) return;
  }

  // 항목 렌더링
  (folder.items || []).forEach(item => {
    container.appendChild(createFavoriteItemRow(item, folder.id, depth, tree, container, currentList));
  });

  // 하위 폴더 렌더링 (재귀)
  (folder.folders || []).forEach(sub => {
    renderFolderNode(container, sub, depth + 1, tree, currentList, false);
  });

  // Root에만 [+ 폴더 추가] 버튼 + Root 드롭존
  if (isRoot) {
    const addRow = document.createElement('div');
    addRow.style.cssText = 'padding:5px 6px; border-top:1px solid #eee;';

    addRow.addEventListener('dragover', (e) => {
      if (!dragState || dragState.type !== 'item' || dragState.sourceFolderId === 'root') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      addRow.style.background = '#e0f5e8';
      addRow.style.outline = '1px dashed #00c73c';
    });
    addRow.addEventListener('dragleave', () => {
      addRow.style.background = '';
      addRow.style.outline = '';
    });
    addRow.addEventListener('drop', (e) => {
      e.preventDefault();
      addRow.style.background = '';
      addRow.style.outline = '';
      if (!dragState || dragState.type !== 'item' || dragState.sourceFolderId === 'root') return;
      removeItemFromTree(tree, dragState.channelId);
      if (!tree.items) tree.items = [];
      tree.items.push({ channelId: dragState.channelId, name: dragState.name, platform: dragState.platform });
      dragState = null;
      saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
    });

    const btnAdd = document.createElement('button');
    btnAdd.textContent = '+ 폴더 추가';
    setMiniButtonStyle(btnAdd, '#868e96');
    btnAdd.style.width = '100%';
    btnAdd.style.fontSize = '11px';
    btnAdd.style.padding = '3px';
    btnAdd.addEventListener('click', () => {
      if (!tree.folders) tree.folders = [];
      tree.folders.push({ id: generateFolderId(), name: '새 폴더', items: [], folders: [], collapsed: false });
      saveFavoriteTree(tree, () => renderFavoriteTree(container, tree, currentList));
    });
    addRow.appendChild(btnAdd);
    container.appendChild(addRow);
  }
}

// ── 즐겨찾기 트리 렌더링 (진입점) ──
function renderFavoriteTree(container, tree, currentList) {
  if (!container) return;
  container.innerHTML = '';
  renderFolderNode(container, tree, 0, tree, currentList, true);
}
