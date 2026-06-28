(function () {
  // chrome-extension:// 내부 iframe에서만 동작
  // window === window.top 은 확장프로그램 iframe에서 항상 true를 반환하므로 사용 불가
  // 대신 ancestorOrigins로 부모 프레임의 origin을 직접 확인
  const ancestors = window.location.ancestorOrigins;
  if (ancestors.length === 0) return;
  if (!ancestors[0].startsWith('chrome-extension://')) return;

  // SOOP 고화질 플레이어가 로컬 앱 감지를 위해 127.0.0.1에 보내는 요청을 차단
  // → 로컬 앱 미설치로 판단하고 HLS 방식으로 자동 폴백, 브라우저 권한 팝업 미발생
  const LOCAL_URL = /^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?/;

  // fetch 차단
  const _fetch = window.fetch;
  window.fetch = function (resource, init) {
    const url = typeof resource === 'string' ? resource
              : (resource instanceof Request ? resource.url : '');
    if (LOCAL_URL.test(url)) {
      return Promise.reject(new TypeError('Failed to fetch'));
    }
    return _fetch.apply(this, arguments);
  };

  // XMLHttpRequest 차단
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._mvBlocked = typeof url === 'string' && LOCAL_URL.test(url);
    return _open.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._mvBlocked) {
      const self = this;
      setTimeout(() => {
        Object.defineProperty(self, 'readyState', { get: () => 4, configurable: true });
        Object.defineProperty(self, 'status',    { get: () => 0, configurable: true });
        self.dispatchEvent(new ProgressEvent('error'));
        self.dispatchEvent(new ProgressEvent('loadend'));
      }, 0);
      return;
    }
    return _send.apply(this, arguments);
  };

  // WebSocket 차단 (ws://127.0.0.1:... 방식도 사용하는 경우 대비)
  const _WebSocket = window.WebSocket;
  function PatchedWebSocket(url, protocols) {
    if (typeof url === 'string' && LOCAL_URL.test(url)) {
      throw new TypeError('Connection refused');
    }
    return protocols !== undefined ? new _WebSocket(url, protocols) : new _WebSocket(url);
  }
  PatchedWebSocket.prototype   = _WebSocket.prototype;
  PatchedWebSocket.CONNECTING  = _WebSocket.CONNECTING;
  PatchedWebSocket.OPEN        = _WebSocket.OPEN;
  PatchedWebSocket.CLOSING     = _WebSocket.CLOSING;
  PatchedWebSocket.CLOSED      = _WebSocket.CLOSED;
  window.WebSocket = PatchedWebSocket;
})();
