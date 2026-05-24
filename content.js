(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);

  // 확장프로그램이 로드한 iframe에서만 동작
  if (!params.has('mv_ext')) return;

  let forceMuted = params.get('mute') === '1';

  // ── 볼륨 적용 ──
  const guardedVideos = new WeakSet();

  function applyVolume(v, vol) {
    v.muted  = (vol === 0);
    v.volume = vol;
  }

  function handleVideo(v) {
    if (!guardedVideos.has(v)) {
      guardedVideos.add(v);

      v.addEventListener('volumechange', () => {
        if (forceMuted && !v.muted) {
          applyVolume(v, 0);
        } else if (!forceMuted) {
          console.log('[mv-vol] 볼륨 변경 감지, 대시보드로 전송:', v.volume, '| parent:', window.parent !== window);
          try {
            window.parent.postMessage({ type: 'chzzk-mv-vol', v: v.volume }, '*');
            console.log('[mv-vol] postMessage 전송 완료');
          } catch (err) {
            console.error('[mv-vol] postMessage 실패:', err);
          }
        }
      }, true);

      applyVolume(v, forceMuted ? 0 : 1);

      const onPlaying = () => setTimeout(triggerWideMode, 2000);
      if (!v.paused && v.currentTime > 0) {
        onPlaying();
      } else {
        v.addEventListener('playing', onPlaying, { once: true });
      }
    } else if (forceMuted) {
      applyVolume(v, 0);
    }
  }

  // ── postMessage: 볼륨 제어 ──
  window.addEventListener('message', ({ data }) => {
    if (!data || data.type !== 'chzzk-mv-audio') return;
    const vol = typeof data.volume === 'number'
      ? Math.max(0, Math.min(1, data.volume))
      : (data.muted ? 0 : 1);
    forceMuted = (vol === 0);
    document.querySelectorAll('video').forEach(v => applyVolume(v, vol));
  });

  // ── 넓은 화면 전환 ──
  let wideModeTriggered = false;

  function triggerWideMode() {
    if (wideModeTriggered) return;
    wideModeTriggered = true;

    // 같은 탭 내 다른 요소에 포커스가 있을 경우 이 iframe으로 강제 복귀
    try { window.focus(); } catch (e) {}

    const video = document.querySelector('video');
    const target = (video && video.closest('[tabindex]')) || document.body;
    target.focus();

    setTimeout(() => {
      ['keydown', 'keyup'].forEach(type => {
        target.dispatchEvent(new KeyboardEvent(type, {
          key: 't',
          code: 'KeyT',
          keyCode: 84,
          which: 84,
          bubbles: true,
          cancelable: true,
        }));
      });
    }, 100);
  }

  // ── 채팅 패널 접기 ──
  let chatCollapsed = false;

  function collapseChat() {
    if (chatCollapsed) return;
    const btn = document.querySelector('[aria-label="채팅 접기"]');
    if (!btn) return;
    chatCollapsed = true;
    btn.click();
  }

  // ── 통합 실행 ──
  function run() {
    document.querySelectorAll('video').forEach(handleVideo);
    collapseChat();
  }

  function init() {
    run();
    [300, 800, 1500, 3000].forEach(ms => setTimeout(run, ms));

    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
