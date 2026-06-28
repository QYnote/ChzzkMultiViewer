// ── 채팅 iframe 세팅 ──
function setChatFrame(streamer) {
  const chatUrl = getPlatform(streamer.platform || 'chzzk').buildChatUrl(streamer.channelId);
  chatStreamerLabel.textContent = streamer.name;

  if (!chatUrl) {
    // 채팅 미지원 플랫폼(SOOP): 패널 강제 숨김, 토글 비활성화
    colChat.classList.add('chat-hidden');
    if (btnToggleChat) {
      btnToggleChat.textContent = '💬 채팅 없음';
      btnToggleChat.disabled = true;
      btnToggleChat.style.opacity = '0.4';
      btnToggleChat.style.cursor = 'default';
    }
    chatFrame.style.display = 'none';
    chatEmptyNotice.style.display = 'block';
    return;
  }

  // 채팅 지원 플랫폼(치지직): 토글 활성화 + 저장된 숨김 상태 복원
  colChat.classList.remove('chat-hidden');
  if (btnToggleChat) {
    btnToggleChat.disabled = false;
    btnToggleChat.style.opacity = '';
    btnToggleChat.style.cursor = '';
    btnToggleChat.textContent = '💬 채팅 숨기기';
  }
  chatFrame.src = chatUrl;
  chatFrame.style.display = 'block';
  chatEmptyNotice.style.display = 'none';
  restoreChatState();
}

// ── 채팅 숨김 상태 복원 ──
function restoreChatState() {
  chrome.storage.local.get(['dashboardChatHidden'], (result) => {
    if (result.dashboardChatHidden) {
      colChat.classList.add('chat-hidden');
      if (btnToggleChat) btnToggleChat.textContent = '💬 채팅 보기';
    }
  });
}
