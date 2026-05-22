// public/js/api.js — API 请求封装

const API = {
  base: '/api',

  async request(path, options = {}) {
    const { method = 'GET', body, auth = true } = options;
    const headers = { 'Content-Type': 'application/json' };

    if (auth) {
      const token = Auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
    return data;
  },

  // Auth
  login(username, password) {
    return this.request('/auth/login', { method: 'POST', body: { username, password }, auth: false });
  },
  register(username, password) {
    return this.request('/auth/register', { method: 'POST', body: { username, password }, auth: false });
  },

  // Entries
  getEntries(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/entries${qs ? '?' + qs : ''}`, { auth: false });
  },
  getEntry(id) {
    return this.request(`/entries/${id}`, { auth: false });
  },
  createEntry(data) {
    return this.request('/entries', { method: 'POST', body: data });
  },
  deleteEntry(id) {
    return this.request(`/entries/${id}`, { method: 'DELETE' });
  },

  // Vote
  vote(entry_id, value) {
    return this.request('/vote', { method: 'POST', body: { entry_id, value } });
  },
  getVoteBalance() {
    return this.request('/vote');
  },
};
