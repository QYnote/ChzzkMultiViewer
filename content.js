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
        // 현재 볼륨을 주기적으로 보고한다. 볼륨 변경 이벤트만 의존하면,
        // 플레이어가 저장된 볼륨을 복원하는 시점이 감시자를 붙이는 시점보다
        // 빠를 때 그 값을 놓쳐 부모가 볼륨을 모르는 채로 남는다.
        if (!forceMuted) {
          window.parent.postMessage({ type: 'chzzk-mv-vol', v: v.volume, muted: v.muted }, '*');
        }
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

  // 음소거 여부는 항상 반영하고, 볼륨 수치는 명시적으로 지정됐을 때만 건드린다.
  // 볼륨을 임의로 덮어쓰면 방송 페이지가 그 값을 자기 상태로 저장해, 다시 로드될 때
  // 페이지에 보이는 상태와 실제 소리가 어긋난다.
  function applyAudio(v, vol, muted) {
    v.muted = muted;
    if (!muted && typeof vol === 'number') v.volume = vol;
  }

  // 음소거 여부만 제어 (볼륨 수치는 건드리지 않음 — 치지직에 저장된 기존 볼륨 유지)
  function setMuted(v, muted) {
    v.muted = muted;
  }

  function handleVideo(v) {
    if (!guardedVideos.has(v)) {
      guardedVideos.add(v);

      v.addEventListener('volumechange', () => {
        if (forceMuted && !v.muted) {
          setMuted(v, true);
        } else if (!forceMuted) {
          try {
            window.parent.postMessage({ type: 'chzzk-mv-vol', v: v.volume, muted: v.muted }, '*');
          } catch (err) {}
        }
      }, true);

      setMuted(v, forceMuted);
      startLatencyReporting(v);

      // 영상을 확보했음을 부모에 알린다. 부모는 이 신호를 받고 볼륨을 지정한다.
      // iframe을 다른 부모로 옮기면 문서가 다시 로드되면서 이 신호도 다시 나가므로,
      // 옮기는 도중에 사라진 볼륨 지정이 이 시점에 복구된다.
      try {
        window.parent.postMessage({ type: 'chzzk-mv-ready' }, '*');
      } catch (err) {}

      const onPlaying = () => setTimeout(triggerWideMode, 2000);
      if (!v.paused && v.currentTime > 0) {
        onPlaying();
      } else {
        v.addEventListener('playing', onPlaying, { once: true });
      }
    } else if (forceMuted) {
      setMuted(v, true);
    }
  }

  // ── postMessage: 볼륨 제어 ──
  window.addEventListener('message', ({ data }) => {
    if (!data || data.type !== 'chzzk-mv-audio') return;

    // lock — 이 화면을 계속 음소거로 붙잡아 둘지 여부. 서브 화면에만 쓴다.
    // 볼륨 0과 잠금을 분리해야, 메인 볼륨이 0이어도 사용자가 직접 풀 수 있다.
    forceMuted = !!data.lock;

    const muted = typeof data.muted === 'boolean' ? data.muted : forceMuted;
    const vol = typeof data.volume === 'number'
      ? Math.max(0, Math.min(1, data.volume))
      : undefined;
    document.querySelectorAll('video').forEach(v => applyAudio(v, vol, muted));
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
