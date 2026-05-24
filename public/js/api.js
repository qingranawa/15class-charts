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
  changePassword(oldPassword, newPassword) {
    return this.request('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } });
  },
  getMe() {
    return this.request("/auth/me");
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

  // Admin
  adminGetUsers() {
    return this.request('/admin/users');
  },
  adminUpdateUser(id, data) {
    return this.request(`/admin/users/${id}`, { method: 'PATCH', body: data });
  },
  adminBanUser(id, duration) {
    return this.request(`/admin/users/${id}`, { method: 'PATCH', body: { ban_duration: duration } });
  },
  adminUnbanUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'PATCH', body: { role: 'user' } });
  },
  adminDeleteUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  },
  adminDeleteEntry(id) {
    return this.request(`/admin/entries/${id}`, { method: 'DELETE' });
  },
  adminUpdateEntry(id, data) {
    return this.request(`/admin/entries/${id}`, { method: 'PATCH', body: data });
  },

  // Reports
  createReport(entryId, reason) {
    return this.request('/reports', { method: 'POST', body: { entry_id: entryId, reason } });
  },
  adminGetReports() {
    return this.request('/admin/reports');
  },
  adminResolveReport(id, resolution) {
    return this.request(`/admin/reports/${id}`, { method: 'PATCH', body: resolution });
  },

  // Deleted entries (recycle bin)
  adminGetDeletedEntries() {
    return this.request('/admin/deleted-entries');
  },
  adminRestoreEntry(id) {
    return this.request(`/admin/deleted-entries/${id}`, { method: 'POST' });
  },
  adminPermanentDeleteEntry(id) {
    return this.request(`/admin/deleted-entries/${id}`, { method: 'DELETE' });
  },
};
