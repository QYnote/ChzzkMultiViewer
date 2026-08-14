// ── 배치 트리 (순수 계산, DOM을 건드리지 않는다) ──
//
// 화면은 칸을 재귀적으로 쪼개서 만든다. 칸은 두 종류다.
//   나눔 칸: { type:'split', dir:'row'|'col', ratios:[...], children:[...] }
//   방송 칸: { type:'cell', channelId:'...' }
//
// dir 'row' 는 좌우로 나눈 것, 'col' 은 위아래로 나눈 것이다.
// ratios 는 합이 1인 비율이라 창 크기가 바뀌어도 배치가 그대로 유지된다.

const LAYOUT_MIN_PX = 80;    // 칸 하나가 가질 수 있는 최소 크기

function makeLayoutCell(channelId) {
  return { type: 'cell', channelId };
}

function makeLayoutSplit(dir, children, ratios) {
  return {
    type: 'split',
    dir,
    children,
    ratios: ratios || children.map(() => 1 / children.length)
  };
}

// ── 채널 수에 맞춘 자동 배치 ──
function createAutoLayout(channelIds) {
  const ids = channelIds || [];
  if (ids.length === 0) return null;
  if (ids.length === 1) return makeLayoutCell(ids[0]);
  if (ids.length === 2) {
    return makeLayoutSplit('row', [makeLayoutCell(ids[0]), makeLayoutCell(ids[1])]);
  }
  if (ids.length === 3) {
    // 왼쪽에 위아래 둘, 오른쪽에 큰 칸 하나. 목록 첫 채널이 큰 칸을 차지한다.
    return makeLayoutSplit('row', [
      makeLayoutSplit('col', [makeLayoutCell(ids[1]), makeLayoutCell(ids[2])]),
      makeLayoutCell(ids[0])
    ], [0.35, 0.65]);
  }

  // 넷 이상은 정사각형에 가까운 균등 격자로 깐다.
  const cols = Math.ceil(Math.sqrt(ids.length));
  const rowNodes = [];
  for (let i = 0; i < ids.length; i += cols) {
    const slice = ids.slice(i, i + cols);
    rowNodes.push(slice.length === 1
      ? makeLayoutCell(slice[0])
      : makeLayoutSplit('row', slice.map(id => makeLayoutCell(id))));
  }
  return rowNodes.length === 1 ? rowNodes[0] : makeLayoutSplit('col', rowNodes);
}

// ── 저장된 값이 배치 트리 모양인지 확인 ──
// 저장소가 손상되었거나 옛 버전 값이 남아 있을 때 그대로 쓰면 화면이 깨진다.
function isValidLayout(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'cell') return typeof node.channelId === 'string' && node.channelId.length > 0;
  if (node.type !== 'split') return false;
  if (node.dir !== 'row' && node.dir !== 'col') return false;
  if (!Array.isArray(node.children) || !Array.isArray(node.ratios)) return false;
  if (node.children.length < 2 || node.children.length !== node.ratios.length) return false;
  if (node.ratios.some(r => typeof r !== 'number' || !(r > 0))) return false;
  return node.children.every(isValidLayout);
}

// ── 트리에 들어 있는 채널 목록 ──
function collectLayoutChannelIds(node, out) {
  const result = out || [];
  if (!node) return result;
  if (node.type === 'cell') { result.push(node.channelId); return result; }
  node.children.forEach(child => collectLayoutChannelIds(child, result));
  return result;
}

// ── 채널 하나를 트리에서 빼기 ──
// 형제가 하나만 남으면 나눔 칸을 없애고 그 형제가 자리를 통째로 흡수한다.
function removeLayoutChannel(node, channelId) {
  if (!node) return null;
  if (node.type === 'cell') return node.channelId === channelId ? null : node;

  const keptChildren = [];
  const keptRatios   = [];
  node.children.forEach((child, i) => {
    const next = removeLayoutChannel(child, channelId);
    if (next) { keptChildren.push(next); keptRatios.push(node.ratios[i]); }
  });

  if (keptChildren.length === 0) return null;
  if (keptChildren.length === 1) return keptChildren[0];

  const sum = keptRatios.reduce((a, b) => a + b, 0);
  return makeLayoutSplit(node.dir, keptChildren, keptRatios.map(r => r / sum));
}

// ── 특정 방송 칸을 다른 칸으로 갈아 끼우기 ──
function replaceLayoutCell(node, channelId, replacement) {
  if (!node) return null;
  if (node.type === 'cell') return node.channelId === channelId ? replacement : node;
  return makeLayoutSplit(
    node.dir,
    node.children.map(child => replaceLayoutCell(child, channelId, replacement)),
    node.ratios.slice()
  );
}

// ── 채널 하나를 트리에 넣기 ──
// 가장 넓은 칸을 반으로 쪼갠다. 가로로 긴 칸은 좌우로, 세로로 긴 칸은 위아래로 자른다.
function addLayoutChannel(node, channelId, stageRect) {
  if (!node) return makeLayoutCell(channelId);

  const { cells } = computeLayoutRects(node, stageRect);
  if (cells.length === 0) return makeLayoutCell(channelId);

  let target = cells[0];
  for (const cell of cells) {
    if (cell.w * cell.h > target.w * target.h) target = cell;
  }

  const dir = target.w >= target.h ? 'row' : 'col';
  return replaceLayoutCell(node, target.channelId, makeLayoutSplit(dir, [
    makeLayoutCell(target.channelId),
    makeLayoutCell(channelId)
  ]));
}

// ── 시청 목록과 배치 맞추기 ──
// 목록에서 빠진 채널의 칸은 없애고, 칸이 없는 채널은 새로 넣는다.
function syncLayoutWithList(node, channelIds, stageRect) {
  if (!node) return createAutoLayout(channelIds);

  let tree = node;
  collectLayoutChannelIds(tree).forEach(id => {
    if (!channelIds.includes(id)) tree = removeLayoutChannel(tree, id);
  });
  if (!tree) return createAutoLayout(channelIds);

  channelIds.forEach(id => {
    if (!collectLayoutChannelIds(tree).includes(id)) {
      tree = addLayoutChannel(tree, id, stageRect);
    }
  });
  return tree;
}

// ── 두 칸의 채널을 맞바꾸기 ──
// 배치 구조는 그대로 두고 어느 칸이 어느 채널을 담는지만 바꾼다.
function swapLayoutChannels(node, idA, idB) {
  if (!node) return null;
  if (node.type === 'cell') {
    if (node.channelId === idA) return makeLayoutCell(idB);
    if (node.channelId === idB) return makeLayoutCell(idA);
    return node;
  }
  return makeLayoutSplit(
    node.dir,
    node.children.map(child => swapLayoutChannels(child, idA, idB)),
    node.ratios.slice()
  );
}

// ── 채널을 다른 칸의 가장자리로 옮기기 ──
// 옮길 채널을 원래 자리에서 먼저 뺀 뒤(형제 칸이 그 자리를 흡수한다),
// 목적지 칸을 둘로 쪼개 그 안에 넣는다. 새로 쪼갠 두 칸은 반반으로 시작한다.
// side — 'left' | 'right' | 'top' | 'bottom'
function moveLayoutChannel(node, sourceId, targetId, side) {
  if (!node || sourceId === targetId) return node;

  const trimmed = removeLayoutChannel(node, sourceId);
  if (!trimmed) return node;

  const dir     = (side === 'left' || side === 'right') ? 'row' : 'col';
  const isFirst = (side === 'left' || side === 'top');
  const children = isFirst
    ? [makeLayoutCell(sourceId), makeLayoutCell(targetId)]
    : [makeLayoutCell(targetId), makeLayoutCell(sourceId)];

  return replaceLayoutCell(trimmed, targetId, makeLayoutSplit(dir, children));
}

// ── 트리를 실제 좌표로 펼치기 ──
// cells   — 방송 칸의 자리 { channelId, x, y, w, h }
// handles — 칸 사이 경계 { node, index, dir, x, y, len, total }
//           node/index 는 "어느 나눔 칸의 몇 번째 경계인지"로, 드래그할 때 쓴다.
function computeLayoutRects(node, rect) {
  const out = { cells: [], handles: [] };
  walkLayout(node, rect, out);
  return out;
}

function walkLayout(node, rect, out) {
  if (!node) return;
  if (node.type === 'cell') {
    out.cells.push({ channelId: node.channelId, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
    return;
  }

  const isRow = node.dir === 'row';
  const total = isRow ? rect.w : rect.h;
  let offset = 0;

  node.children.forEach((child, i) => {
    const size = total * node.ratios[i];
    walkLayout(child, isRow
      ? { x: rect.x + offset, y: rect.y, w: size, h: rect.h }
      : { x: rect.x, y: rect.y + offset, w: rect.w, h: size }, out);

    offset += size;
    if (i < node.children.length - 1) {
      out.handles.push({
        node, index: i, dir: node.dir,
        x:   isRow ? rect.x + offset : rect.x,
        y:   isRow ? rect.y : rect.y + offset,
        len: isRow ? rect.h : rect.w,
        total
      });
    }
  });
}

// ── 경계를 끌었을 때 비율 다시 계산 ──
// 경계 양쪽 두 칸만 서로 주고받는다. 나머지 칸은 건드리지 않는다.
// 어느 쪽도 최소 크기보다 작아지지 않도록 이동량을 잘라낸다.
function resizeLayoutRatios(node, index, startRatios, deltaPx, total) {
  const before = startRatios[index];
  const after  = startRatios[index + 1];

  const minRatio = total > 0 ? LAYOUT_MIN_PX / total : 0;
  const lower = -(before - minRatio);
  const upper = after - minRatio;
  if (upper < lower) return;   // 둘 다 최소 크기라 더 조절할 수 없다

  const delta = Math.max(lower, Math.min(upper, total > 0 ? deltaPx / total : 0));

  node.ratios = startRatios.slice();
  node.ratios[index]     = before + delta;
  node.ratios[index + 1] = after  - delta;
}
