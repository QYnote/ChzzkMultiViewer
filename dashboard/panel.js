// ── 칸 위에 얹히는 조작 화면 ──
// 채널 이름, 딜레이, 새로고침, 영역 확대를 담당한다.
// 모든 칸이 동등하므로 칸마다 같은 조작을 가진다.
//
// 음량은 다루지 않는다. 각 칸은 방송 페이지를 그대로 띄우고 있으므로 그 페이지가
// 원래 가진 음량 조절을 쓴다. 우리가 따로 조절하면 방송 페이지가 기억하는 값과
// 어긋나 다음에 열 때 엉뚱한 음량으로 시작한다.

// 방송 페이지가 온전히 그려지는 최소 너비. 플랫폼마다 다르다.
// 칸이 이보다 좁으면 이 너비로 그린 뒤 줄여서 끼운다.
// 올리면 좁은 칸에서 글씨가 작아지고, 내리면 페이지가 삐져나가 스크롤 막대가 생긴다.
//
// 치지직 값은 실제로 재서 얻었다. 칸을 303px로도 934px로도 줄여 봤지만 페이지 폭이
// 950px에서 멈췄다. 넓은 화면인 상태에서도 그랬으므로 넓은 화면과는 무관한 제약이다.
//
// 잰 값보다 조금 높여 둔 까닭은, 폭 1920인 화면을 좌우로 나누면 칸이 약 955px이 되어
// 950 바로 위로 빠지기 때문이다. 그 칸만 줄이지 않고 그리는 바람에 옆 칸과 배치가
// 어긋나 보였다.
//
// ⚠️ 이 값보다 넓은 칸은 여전히 줄이지 않고 그린다. 그런 칸은 다른 칸과 배치가 어긋나
//    보이는데, 화면이 클수록 그런 칸이 자주 나온다. 경계를 아예 없애려면 칸 크기와
//    무관하게 늘 같은 폭으로 그려야 하지만, 그러면 큰 칸이 확대되어 흐릿해진다.
const MIN_PAGE_WIDTH = { soop: 640, chzzk: 960 };

function createCellOverlay(streamer, iframe, box) {
  const overlay = document.createElement('div');
  overlay.className = 'cell-overlay';
  overlay.innerHTML = `
    <div class="cell-top">
      <span class="cell-name"></span>
    </div>
  `;
  overlay.querySelector('.cell-name').textContent = streamer.name;

  // ── 조작 줄 (우측 상단) ──
  // 방송 페이지의 조작 바가 화면 아래쪽을 쓰므로, 우리 조작은 전부 위로 모은다.
  // 아래를 비워 두어야 볼륨·전체화면 같은 방송 페이지 기능을 그대로 쓸 수 있다.
  const toolbar = document.createElement('div');
  toolbar.className = 'cell-toolbar';
  toolbar.innerHTML = `
    <span class="cell-latency-label"></span>
    <button class="cell-tool-btn btn-cell-refresh" title="새로고침">↻</button>
    <button class="cell-tool-btn btn-cell-grab" title="끌어서 자리 옮기기">⠿</button>
    <button class="cell-tool-btn btn-cell-menu" title="기타 조작">⋯</button>
  `;
  const btnMenu = toolbar.querySelector('.btn-cell-menu');

  // 손잡이를 잡아야 끌기가 시작된다. 방송 화면 위에서 누른 마우스는 방송 페이지가
  // 먼저 가져가므로 칸 아무 데나 잡아 끄는 방식은 만들 수 없다.
  toolbar.querySelector('.btn-cell-grab').addEventListener('mousedown', (e) => {
    startCellDrag(e, streamer.channelId);
  });

  const menu = document.createElement('div');
  menu.className = 'cell-menu';
  menu.innerHTML = `
    <button class="cell-menu-item" data-act="zoom">⊞ 영역 확대</button>
    <button class="cell-menu-item" data-act="zoom-reset">⊡ 원래 화면으로</button>
  `;
  const itemZoomReset = menu.querySelector('[data-act="zoom-reset"]');
  itemZoomReset.style.display = 'none';

  function closeCellMenu() {
    box.classList.remove('menu-open');
  }

  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    box.classList.toggle('menu-open');
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.cell-menu-item');
    if (!item) return;
    e.stopPropagation();
    closeCellMenu();
    if (item.dataset.act === 'zoom') startDragSelect();
    else resetZoom();
  });

  // 칸 밖으로 나가거나 칸의 다른 곳을 누르면 닫는다
  box.addEventListener('mouseleave', closeCellMenu);
  box.addEventListener('mousedown', (e) => {
    if (!menu.contains(e.target) && !btnMenu.contains(e.target)) closeCellMenu();
  });

  box.appendChild(toolbar);
  box.appendChild(menu);

  // ── 방송 화면 크기와 영역 확대 ──
  //
  // 방송 화면은 기본적으로 칸과 같은 크기로 그린다. 다만 SOOP 방송 페이지는 폭이
  // 좁아지면 화면이 잘리고 왼쪽에 여백이 생긴다. 그래서 좁을 때는 페이지를 넉넉한
  // 너비로 그린 뒤 칸 크기에 맞춰 줄여서 끼운다. 높이는 칸의 가로세로 비율을 그대로
  // 따라가므로 찌그러지지 않는다.
  //
  // 확대와 이 축소는 같은 변형을 쓰므로 한곳에서 계산한다. 확대 중이면 확대가 이긴다.

  let isZoomed = false;
  let zoomRegion = null;          // 페이지 좌표 기준 비율 (칸 기준이 아니다)
  let viewOffsetX = 0;            // 지금 화면에 적용 중인 변형
  let viewOffsetY = 0;
  let viewScale = 1;

  // 방송 페이지를 어느 너비로 그릴지
  function getPageWidth(boxWidth) {
    const min = MIN_PAGE_WIDTH[box.dataset.platform] || 0;
    return boxWidth < min ? min : boxWidth;
  }

  function applyFrameLayout() {
    const bw = box.clientWidth;
    const bh = box.clientHeight;
    if (bw <= 0 || bh <= 0) return;

    const pw = getPageWidth(bw);
    const fitScale = bw / pw;
    const ph = bh / fitScale;     // 칸의 가로세로 비율 유지

    iframe.style.width  = pw + 'px';
    iframe.style.height = ph + 'px';
    iframe.style.transformOrigin = '0 0';

    if (isZoomed && zoomRegion) {
      // 확대 우선 — 고른 영역이 칸을 꽉 채우도록 맞춘다
      const rx = zoomRegion.rxPct * pw;
      const ry = zoomRegion.ryPct * ph;
      const rw = zoomRegion.rwPct * pw;
      const rh = zoomRegion.rhPct * ph;
      viewScale   = Math.min(bw / rw, bh / rh);
      viewOffsetX = (bw - rw * viewScale) / 2;
      viewOffsetY = (bh - rh * viewScale) / 2;
      iframe.style.transform =
        `translate(${viewOffsetX}px,${viewOffsetY}px) scale(${viewScale}) translate(${-rx}px,${-ry}px)`;
    } else {
      viewScale   = fitScale;
      viewOffsetX = 0;
      viewOffsetY = 0;
      iframe.style.transform = fitScale === 1 ? '' : `scale(${fitScale})`;
    }
  }

  // 눈에 보이는 칸 좌표 → 방송 페이지 좌표
  function boxToPage(px, py) {
    return { x: (px - viewOffsetX) / viewScale, y: (py - viewOffsetY) / viewScale };
  }

  // 드래그로 고른 영역(칸 픽셀 기준)을 페이지 좌표로 되돌려 기억한다.
  // 줄여 놓은 상태에서 골라도, 이미 확대 중인 상태에서 더 골라도 같은 방식으로 맞는다.
  function applyZoom(boxDx, boxDy, boxDw, boxDh) {
    const bw = box.clientWidth;
    const bh = box.clientHeight;
    if (bw <= 0 || bh <= 0) return;

    const pw = getPageWidth(bw);
    const ph = bh / (bw / pw);

    const p1 = boxToPage(boxDx, boxDy);
    const p2 = boxToPage(boxDx + boxDw, boxDy + boxDh);

    zoomRegion = {
      rxPct: Math.min(p1.x, p2.x) / pw,
      ryPct: Math.min(p1.y, p2.y) / ph,
      rwPct: Math.abs(p2.x - p1.x) / pw,
      rhPct: Math.abs(p2.y - p1.y) / ph
    };
    isZoomed = true;
    itemZoomReset.style.display = '';
    applyFrameLayout();
  }

  function resetZoom() {
    isZoomed = false;
    zoomRegion = null;
    itemZoomReset.style.display = 'none';
    applyFrameLayout();
  }

  // 칸 크기가 바뀌면 축소 비율도 확대 위치도 다시 계산해야 한다
  new ResizeObserver(applyFrameLayout).observe(box);
  applyFrameLayout();

  function startDragSelect() {
    const dragOverlay = document.createElement('div');
    dragOverlay.className = 'zoom-drag-overlay';

    const hint = document.createElement('div');
    hint.className = 'zoom-drag-hint';
    hint.textContent = '확대할 영역을 드래그하세요 · ESC로 취소';
    dragOverlay.appendChild(hint);

    const selRect = document.createElement('div');
    selRect.className = 'zoom-drag-rect';
    selRect.style.display = 'none';
    dragOverlay.appendChild(selRect);

    box.appendChild(dragOverlay);

    let startX = 0, startY = 0, dragging = false;

    function getPos(e) {
      const b = dragOverlay.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(e.clientX - b.left, b.width)),
        y: Math.max(0, Math.min(e.clientY - b.top,  b.height))
      };
    }

    function cancel() {
      dragOverlay.remove();
      document.body.style.userSelect = '';
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') cancel();
    }
    document.addEventListener('keydown', onKeydown);

    dragOverlay.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      document.body.style.userSelect = 'none';
      const p = getPos(e);
      startX = p.x; startY = p.y;
      dragging = true;
      hint.style.display = 'none';
      selRect.style.display = 'block';
      selRect.style.left = startX + 'px';
      selRect.style.top = startY + 'px';
      selRect.style.width = '0';
      selRect.style.height = '0';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      const p = getPos(e);
      selRect.style.left   = Math.min(startX, p.x) + 'px';
      selRect.style.top    = Math.min(startY, p.y) + 'px';
      selRect.style.width  = Math.abs(p.x - startX) + 'px';
      selRect.style.height = Math.abs(p.y - startY) + 'px';
    }

    function onMouseUp(e) {
      if (!dragging) return;
      dragging = false;
      const p = getPos(e);
      const tw = box.clientWidth, th = box.clientHeight;
      const rx = Math.min(startX, p.x), ry = Math.min(startY, p.y);
      const rw = Math.abs(p.x - startX), rh = Math.abs(p.y - startY);

      cancel();

      if (rw < tw * 0.05 || rh < th * 0.05) {
        const msg = document.createElement('div');
        msg.className = 'zoom-cancel-msg';
        msg.textContent = '선택 영역이 너무 작습니다';
        box.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
        return;
      }

      applyZoom(rx, ry, rw, rh);
    }
  }

  toolbar.querySelector('.btn-cell-refresh').addEventListener('click', (e) => {
    e.stopPropagation();
    resetZoom();
    box.querySelector('.init-notice')?.remove();
    box.querySelector('.manual-wide-notice')?.remove();
    box.appendChild(createInitNotice());
    iframe.src = buildIframeSrc(iframe);
  });

  return overlay;
}
