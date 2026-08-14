// ── 칸을 끌어 자리 옮기기 ──
//
// 방송 화면 위에서 누른 마우스는 방송 페이지가 먼저 가져가므로 우리에게 오지 않는다.
// 그래서 칸 전체가 아니라 조작 줄의 손잡이를 잡아야 끌기가 시작된다.
// 끌기가 시작되면 모든 방송 화면의 마우스 입력을 잠시 꺼서, 다른 칸 위를 지나가도
// 놓을 자리 표시가 끊기지 않게 한다.

const DROP_EDGE_RATIO = 0.25;   // 칸 가장자리로 볼 범위 (나머지 가운데는 자리 교환)
const DRAG_START_PX   = 5;      // 이만큼 움직여야 끌기로 본다

// ── 마우스 위치로 놓을 자리 정하기 ──
function findDropTarget(clientX, clientY, sourceId) {
  if (!layoutTree) return null;

  const stageBox = stageEl.getBoundingClientRect();
  const x = clientX - stageBox.left;
  const y = clientY - stageBox.top;

  const { cells } = computeLayoutRects(layoutTree, getStageRect());
  const cell = cells.find(c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
  if (!cell || cell.channelId === sourceId) return null;

  // 네 변까지의 거리를 비율로 재서 가장 가까운 변을 고른다.
  // 모서리에서는 더 가까운 쪽이 이긴다.
  const toLeft   = (x - cell.x) / cell.w;
  const toRight  = 1 - toLeft;
  const toTop    = (y - cell.y) / cell.h;
  const toBottom = 1 - toTop;

  const nearest = Math.min(toLeft, toRight, toTop, toBottom);
  let side = 'center';
  if (nearest < DROP_EDGE_RATIO) {
    if      (nearest === toLeft)  side = 'left';
    else if (nearest === toRight) side = 'right';
    else if (nearest === toTop)   side = 'top';
    else                          side = 'bottom';
  }

  // 쪼갠 결과가 최소 크기보다 작아지면 가장자리를 내주지 않는다.
  // 가운데(자리 교환)만 남으므로, 좁은 칸에 억지로 밀어 넣어 쓸 수 없는 칸이
  // 생기는 일이 없다.
  if (side !== 'center') {
    const half = (side === 'left' || side === 'right') ? cell.w / 2 : cell.h / 2;
    if (half < LAYOUT_MIN_PX) side = 'center';
  }

  return { cell, side };
}

// ── 놓을 자리 미리보기 ──
function updateDropIndicator(indicator, drop) {
  if (!drop) {
    indicator.style.display = 'none';
    return;
  }

  const { cell, side } = drop;
  let { x, y, w, h } = cell;

  if      (side === 'left')   { w = w / 2; }
  else if (side === 'right')  { x = x + w / 2; w = w / 2; }
  else if (side === 'top')    { h = h / 2; }
  else if (side === 'bottom') { y = y + h / 2; h = h / 2; }

  indicator.style.display = 'block';
  indicator.style.left   = x + 'px';
  indicator.style.top    = y + 'px';
  indicator.style.width  = w + 'px';
  indicator.style.height = h + 'px';
  indicator.classList.toggle('is-swap', side === 'center');
}

// ── 끌기 시작 ──
function startCellDrag(e, sourceId) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;
  let dragging  = false;
  let drop      = null;
  let indicator = null;
  let ghost     = null;

  function begin() {
    dragging = true;

    // 방송 화면이 마우스를 가로채면 놓을 자리를 못 읽는다
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    channelBoxes.get(sourceId)?.classList.add('is-dragging');

    indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    indicator.style.display = 'none';
    stageEl.appendChild(indicator);

    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = channelBoxes.get(sourceId)?.dataset.name || '';
    document.body.appendChild(ghost);
  }

  function onMouseMove(mv) {
    if (!dragging) {
      if (Math.abs(mv.clientX - startX) < DRAG_START_PX
       && Math.abs(mv.clientY - startY) < DRAG_START_PX) return;
      begin();
    }
    ghost.style.left = (mv.clientX + 14) + 'px';
    ghost.style.top  = (mv.clientY + 14) + 'px';

    drop = findDropTarget(mv.clientX, mv.clientY, sourceId);
    updateDropIndicator(indicator, drop);
  }

  function cleanUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
    if (!dragging) return;

    indicator?.remove();
    ghost?.remove();
    channelBoxes.get(sourceId)?.classList.remove('is-dragging');
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  function onMouseUp() {
    const applied = dragging && drop;
    const target  = drop;
    cleanUp();
    if (!applied) return;

    // 트리만 고치고 방송 화면 상자는 새 좌표로 옮겨질 뿐이라 영상이 끊기지 않는다
    layoutTree = target.side === 'center'
      ? swapLayoutChannels(layoutTree, sourceId, target.cell.channelId)
      : moveLayoutChannel(layoutTree, sourceId, target.cell.channelId, target.side);

    applyLayout();
    saveLayoutTree();
  }

  function onKeyDown(ke) {
    if (ke.key !== 'Escape') return;
    drop = null;
    cleanUp();
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}
