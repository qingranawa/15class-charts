// public/js/auth.js — 鉴权状态管理

const Auth = {
  _token: null,
  _user: null,

  // 安全解码 base64（兼容服务端 safeBtoa 输出的 UTF-8 字节）
  _safeAtob(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  },

  init() {
    this._token = localStorage.getItem('token');
    try {
      this._user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch { this._user = null; }
    // 验证 token 是否过期，同时从 JWT payload 提取最新 role（防止 localStorage 里的 user 信息过时）
    if (this._token) {
      try {
        // 兼容 base64url：替换 URL-safe 字符后再用 atob
        let payload = this._token.split('.')[1];
        payload = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (payload.length % 4) payload += '=';
        const data = JSON.parse(this._safeAtob(payload));
        if (data.exp < Date.now()) { this.logout(); return; }
        // 用 JWT payload 中权威的 role 更新 user 对象
        if (this._user) {
          this._user.role = data.role;
        } else {
          this._user = { id: data.userId, username: data.username, role: data.role };
        }
      } catch { this.logout(); }
    }
  },

  getToken() { return this._token; },
  getUser() { return this._user; },
  isLoggedIn() { return !!this._token && !!this._user; },

  setSession(token, user) {
    this._token = token;
    this._user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  logout() {
    this._token = null;
    this._user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
