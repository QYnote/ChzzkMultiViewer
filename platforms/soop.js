const SoopAdapter = {
  id: 'soop',

  async fetchFollowingList() {
    const url = 'https://myapi.sooplive.com/api/favorite';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    const status = response.status;
    let data = null;
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) return { success: false, httpStatus: status, data };
    if (!Array.isArray(data?.data)) return { success: false, data };
    return { success: true, data };
  },

  buildStreamUrl(channelId, muted) {
    return `https://play.sooplive.com/${channelId}?mv_ext=1${muted ? '&mute=1' : ''}`;
  },

  buildChatUrl(channelId) {
    return '';
  },

  async fetchLiveStatus(channelId) {
    const url = `https://live.sooplive.com/afreeca/player_live_api.php?bjid=${channelId}`;
    const body = `bid=${channelId}&bno=&type=live&pwd=&player_type=html5&stream_type=common&quality=HD&mode=landing&from_api=0&is_revive=false`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body
    });
    if (!response.ok) return { openLive: null, channelImageUrl: null };
    const data = await response.json();
    const openLive = data?.CHANNEL?.RESULT === 1;
    const channelImageUrl = `https://stimg.sooplive.com/LOGO/${channelId.substring(0, 2)}/${channelId}/m/${channelId}.webp`;
    return { openLive, channelImageUrl };
  }
};
