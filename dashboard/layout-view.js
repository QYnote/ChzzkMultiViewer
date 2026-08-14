// ── 배치 트리를 화면에 반영하기 ──
//
// 방송 화면 상자는 만들 때 한 번만 화면에 넣고, 그 뒤로는 위치와 크기만 바꾼다.
// 상자를 다른 부모 밑으로 옮기면 브라우저가 그 안의 방송을 버리고 다시 읽어들이기
// 때문이다. 자리만 옮기면 영상이 끊기지 않는다.

// stageEl(바탕) · layoutTree(현재 배치) · channelBoxes(채널 ID → 상자)는 main.js에서 선언한다.

const LAYOUT_HANDLE_PX = 8;               // 경계를 잡을 수 있는 두께

// ── 배치 저장/읽기 ──
function saveLayoutTree() {
  if (!layoutTree) return;
  chrome.storage.local.set({ dashboardLayoutTree: layoutTree });
}

function readLayoutTree(callback) {
  chrome.storage.local.get(['dashboardLayoutTree'], (result) => {
    const saved = result.dashboardLayoutTree;
    callback(isValidLayout(saved) ? saved : null);
  });
}

// ── 바탕 크기 ──
function getStageRect() {
  return { x: 0, y: 0, w: stageEl.clientWidth, h: stageEl.clientHeight };
}

// ── 트리대로 상자와 경계를 배치 ──
function applyLayout() {
  if (!stageEl || !layoutTree) return;

  const rect = getStageRect();
  if (rect.w <= 0 || rect.h <= 0) return;

  const { cells, handles } = computeLayoutRects(layoutTree, rect);

  const placed = new Set();
  cells.forEach(cell => {
    const box = channelBoxes.get(cell.channelId);
    if (!box) return;
    placed.add(cell.channelId);
    box.style.display = '';
    box.style.left   = cell.x + 'px';
    box.style.top    = cell.y + 'px';
    box.style.width  = cell.w + 'px';
    box.style.height = cell.h + 'px';
  });

  // 트리에 자리가 없는 상자는 숨긴다 (정상 상태에서는 생기지 않는다)
  channelBoxes.forEach((box, channelId) => {
    if (!placed.has(channelId)) box.style.display = 'none';
  });

  renderLayoutHandles(handles);
}

// ── 경계 다시 그리기 ──
// 경계는 끌 때마다 자리가 달라지므로 매번 새로 만든다. 개수가 적어 부담이 없다.
function renderLayoutHandles(handles) {
  stageEl.querySelectorAll('.layout-handle').forEach(el => el.remove());

  handles.forEach(handle => {
    const el = document.createElement('div');
    el.className = 'layout-handle ' + (handle.dir === 'row' ? 'is-vertical' : 'is-horizontal');

    if (handle.dir === 'row') {
      el.style.left   = (handle.x - LAYOUT_HANDLE_PX / 2) + 'px';
      el.style.top    = handle.y + 'px';
      el.style.width  = LAYOUT_HANDLE_PX + 'px';
      el.style.height = handle.len + 'px';
    } else {
      el.style.left   = handle.x + 'px';
      el.style.top    = (handle.y - LAYOUT_HANDLE_PX / 2) + 'px';
      el.style.width  = handle.len + 'px';
      el.style.height = LAYOUT_HANDLE_PX + 'px';
    }

    el.addEventListener('mousedown', (e) => startHandleDrag(e, handle));
    stageEl.appendChild(el);
  });
}

// ── 경계 끌기 ──
function startHandleDrag(e, handle) {
  if (e.button !== 0) return;
  e.preventDefault();

  const isRow       = handle.dir === 'row';
  const startPos    = isRow ? e.clientX : e.clientY;
  const startRatios = handle.node.ratios.slice();

  // 방송 화면 위로 마우스가 지나가면 그쪽이 입력을 가로채 드래그가 끊긴다.
  document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
  document.body.style.cursor     = isRow ? 'col-resize' : 'row-resize';
  document.body.style.userSelect = 'none';

  function onMouseMove(mv) {
    const delta = (isRow ? mv.clientX : mv.clientY) - startPos;
    resizeLayoutRatios(handle.node, handle.index, startRatios, delta, handle.total);
    applyLayout();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    saveLayoutTree();
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// ── 창 크기 변경 ──
// 비율은 그대로 두고 좌표만 다시 계산하므로 방송이 다시 읽히지 않는다.
function initLayoutResize() {
  window.addEventListener('resize', applyLayout);
}
