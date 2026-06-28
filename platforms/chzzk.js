const ChzzkAdapter = {
  id: 'chzzk',

  async fetchFollowingList() {
    const url = 'https://api.chzzk.naver.com/service/v1/channels/followings?page=0&size=500&sortType=FOLLOW';
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    const status = response.status;
    let data = null;
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) return { success: false, httpStatus: status, data };
    return { success: true, data };
  },

  buildStreamUrl(channelId, muted) {
    return `https://chzzk.naver.com/live/${channelId}?${muted ? 'mute=1&' : ''}mv_ext=1`;
  },

  buildChatUrl(channelId) {
    return `https://chzzk.naver.com/live/${channelId}/chat`;
  },

  async fetchLiveStatus(channelId) {
    const url = `https://api.chzzk.naver.com/service/v1/channels/${channelId}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return { openLive: null, channelImageUrl: null };
    const data = await response.json();
    return {
      openLive: data?.content?.openLive ?? null,
      channelImageUrl: data?.content?.channelImageUrl ?? null
    };
  }
};
