// ── 칸 위에 얹히는 조작 화면 ──
// 채널 이름, 딜레이, 새로고침, 영역 확대를 담당한다.
// 모든 칸이 동등하므로 칸마다 같은 조작을 가진다.
//
// 음량은 다루지 않는다. 각 칸은 방송 페이지를 그대로 띄우고 있으므로 그 페이지가
// 원래 가진 음량 조절을 쓴다. 우리가 따로 조절하면 방송 페이지가 기억하는 값과
// 어긋나 다음에 열 때 엉뚱한 음량으로 시작한다.

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

  // ── 영역 확대 ──
  let isZoomed = false;
  let zoomRegion = null;
  let zoomResizeObserver = null;

  function applyZoomTransform(tw, th) {
    const rx = zoomRegion.rxPct * tw;
    const ry = zoomRegion.ryPct * th;
    const rw = zoomRegion.rwPct * tw;
    const rh = zoomRegion.rhPct * th;
    const s = Math.min(tw / rw, th / rh);
    const offsetX = (tw - rw * s) / 2;
    const offsetY = (th - rh * s) / 2;
    iframe.style.transformOrigin = '0 0';
    iframe.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${s}) translate(${-rx}px,${-ry}px)`;
  }

  // boxDx/boxDy/boxDw/boxDh: 드래그로 고른 좌표 (항상 칸 픽셀 기준)
  // 이미 확대 중이면 현재 변환의 역계산으로 원본 화면 좌표에 맞춘다.
  function applyZoom(boxDx, boxDy, boxDw, boxDh) {
    const tw = box.clientWidth;
    const th = box.clientHeight;

    let frameRx, frameRy, frameRw, frameRh;

    if (isZoomed && zoomRegion) {
      const origRx = zoomRegion.rxPct * tw;
      const origRy = zoomRegion.ryPct * th;
      const origRw = zoomRegion.rwPct * tw;
      const origRh = zoomRegion.rhPct * th;
      const s = Math.min(tw / origRw, th / origRh);
      const offsetX = (tw - origRw * s) / 2;
      const offsetY = (th - origRh * s) / 2;

      function boxToFrame(px, py) {
        return { x: (px - offsetX) / s + origRx, y: (py - offsetY) / s + origRy };
      }
      const p1 = boxToFrame(boxDx, boxDy);
      const p2 = boxToFrame(boxDx + boxDw, boxDy + boxDh);

      frameRx = Math.min(p1.x, p2.x);
      frameRy = Math.min(p1.y, p2.y);
      frameRw = Math.abs(p1.x - p2.x);
      frameRh = Math.abs(p1.y - p2.y);
    } else {
      frameRx = boxDx;
      frameRy = boxDy;
      frameRw = boxDw;
      frameRh = boxDh;
    }

    zoomRegion = { rxPct: frameRx / tw, ryPct: frameRy / th, rwPct: frameRw / tw, rhPct: frameRh / th };
    applyZoomTransform(tw, th);
    isZoomed = true;
    itemZoomReset.style.display = '';

    if (!zoomResizeObserver) {
      zoomResizeObserver = new ResizeObserver(() => {
        if (isZoomed && zoomRegion) applyZoomTransform(box.clientWidth, box.clientHeight);
      });
      zoomResizeObserver.observe(box);
    }
  }

  function resetZoom() {
    iframe.style.transform = '';
    iframe.style.transformOrigin = '';
    isZoomed = false;
    zoomRegion = null;
    if (zoomResizeObserver) { zoomResizeObserver.disconnect(); zoomResizeObserver = null; }
    itemZoomReset.style.display = 'none';
  }

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
