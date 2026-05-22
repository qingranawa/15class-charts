// public/js/auth.js — 鉴权状态管理

const Auth = {
  _token: null,
  _user: null,

  init() {
    this._token = localStorage.getItem('token');
    try {
      this._user = JSON.parse(localStorage.getItem('user') || 'null');
    } catch { this._user = null; }
    // 验证 token 是否过期
    if (this._token && this._user) {
      try {
        const payload = JSON.parse(atob(this._token.split('.')[1]));
        if (payload.exp < Date.now()) this.logout();
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
