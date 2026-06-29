(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);

  // 확장프로그램이 로드한 iframe에서만 동작
  if (!params.has('mv_ext')) return;

  let forceMuted = params.get('mute') === '1';

  // ── 딜레이 측정 ──
  let latencyTimer = null;

  function startLatencyReporting(v) {
    if (latencyTimer) return;
    latencyTimer = setInterval(() => {
      try {
        if (v.seekable.length > 0) {
          const liveEdge = v.seekable.end(v.seekable.length - 1);
          const latency  = liveEdge - v.currentTime;
          if (latency >= 0) {
            window.parent.postMessage({ type: 'chzzk-mv-latency', v: latency }, '*');
          }
        }
      } catch (e) {}
    }, 1000);
  }

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
          try {
            window.parent.postMessage({ type: 'chzzk-mv-vol', v: v.volume }, '*');
          } catch (err) {}
        }
      }, true);

      applyVolume(v, forceMuted ? 0 : 1);
      startLatencyReporting(v);

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

  // ── 플랫폼 감지 ──
  const isSoop = window.location.hostname === 'play.sooplive.com';

  // ── 넓은 화면 전환 ──
  let wideModeTriggered = false;

  function isWideMode() {
    if (isSoop) return document.body.classList.contains('screen_mode');
    const layout = document.querySelector('#live_player_layout');
    return !!layout && layout.classList.contains('is_large');
  }

  function pressWide() {
    if (isSoop) {
      const btn = document.querySelector('.btn_screen_mode');
      if (btn) btn.click();
      return;
    }
    const wideBtn = document.querySelector('[aria-label="넓은 화면"]');
    if (wideBtn) wideBtn.click();
  }

  let wideModeTimer = null;

  function triggerWideMode() {
    if (wideModeTriggered) return;
    wideModeTriggered = true;

    // 1초마다 와이드 모드 여부 확인 후 T 키 (최대 1분)
    // 즉시 판단하지 않음 — 새로고침 직후 렌더링 지연 대응
    let attempts = 0;
    wideModeTimer = setInterval(() => {
      if (isWideMode()) {
        clearInterval(wideModeTimer);
        wideModeTimer = null;
        window.parent.postMessage({ type: 'chzzk-mv-wide-done', success: true }, '*');
        return;
      }
      pressWide();
      if (++attempts >= 60) {
        clearInterval(wideModeTimer);
        wideModeTimer = null;
        window.parent.postMessage({ type: 'chzzk-mv-wide-done', success: false }, '*');
      }
    }, 300);
  }

  // ── postMessage: 와이드 모드 재시도 (메인↔서브 스왑 시) ──
  window.addEventListener('message', ({ data }) => {
    if (!data || data.type !== 'chzzk-mv-retrigger-wide') return;
    if (wideModeTimer) {
      clearInterval(wideModeTimer);
      wideModeTimer = null;
    }
    wideModeTriggered = false;
    triggerWideMode();
  });

  // ── 탭 복귀 시 와이드 모드 재시도 ──
  // 비활성 탭에서는 pressT()가 동작하지 않아 와이드 모드 전환이 실패할 수 있음
  // 탭으로 돌아왔을 때 와이드 모드가 안 된 상태면 다시 시도
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!wideModeTriggered || isWideMode()) return;
    if (wideModeTimer) { clearInterval(wideModeTimer); wideModeTimer = null; }
    wideModeTriggered = false;
    triggerWideMode();
  });

  // ── 채팅 패널 접기 ──
  let chatCollapsed = false;

  function collapseChat() {
    if (chatCollapsed) return;
    const btn = document.querySelector('[aria-label="채팅 접기"]');
    if (!btn) return;
    chatCollapsed = true;
    btn.click();
  }

  // ── SOOP 고화질 스트리머 연결 안내 팝업 자동 닫기 ──
  function dismissSoopAgentPopup() {
    if (!isSoop) return;
    const btn = document.querySelector('.no_agent_install');
    if (btn) btn.click();
  }

  // ── SOOP 채팅 영역 자동 닫기 ──
  function collapseSoopChat() {
    if (!isSoop) return;
    const area = document.querySelector('#chatting_area');
    if (!area || area.style.display === 'none') return;
    const btn = document.querySelector('#setbox_close a');
    if (!btn) return;
    // href="javascript:;" 클릭 시 CSP 위반 에러 방지: 클릭 전 href 제거
    btn.removeAttribute('href');
    btn.click();
  }

  // ── 광고 감지 + 스킵 ──
  let lastAdState = null;
  let adSkipAttempted = false;

  function reportAdState() {
    const isAd = isSoop
      ? !!document.getElementById('da_btn_skip')
      : !!document.querySelector('[data-role="skipInfo"]');
    if (isAd !== lastAdState) {
      lastAdState = isAd;
      if (!isAd) adSkipAttempted = false;
      try { window.parent.postMessage({ type: 'chzzk-mv-ad', isAd }, '*'); } catch (e) {}
    }
  }

  function skipAdIfPossible() {
    if (adSkipAttempted) return;
    if (isSoop) {
      const btn = document.querySelector('#da_btn_skip.skip_on');
      if (btn && btn.style.display !== 'none') {
        adSkipAttempted = true;
        btn.click();
      }
    } else {
      const btn = document.querySelector('[data-role="skipBtn"]:not(.hide)');
      if (btn) {
        adSkipAttempted = true;
        btn.click();
      }
    }
  }

  // ── 통합 실행 ──
  function run() {
    document.querySelectorAll('video').forEach(handleVideo);
    collapseChat();
    dismissSoopAgentPopup();
    collapseSoopChat();
    reportAdState();
    skipAdIfPossible();
  }

  function init() {
    run();
    [300, 800, 1500, 3000].forEach(ms => setTimeout(run, ms));

    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);

    setInterval(skipAdIfPossible, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
