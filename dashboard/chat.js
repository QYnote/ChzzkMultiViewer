// ── 채팅 iframe 세팅 ──
function setChatFrame(streamer) {
  chatFrame.src = `https://chzzk.naver.com/live/${streamer.channelId}/chat`;
  chatFrame.style.display = 'block';
  chatEmptyNotice.style.display = 'none';
  chatStreamerLabel.textContent = streamer.name;
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
