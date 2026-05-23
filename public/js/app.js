// public/js/app.js — 主应用逻辑

const App = {
  currentPage: 1,
  currentSort: 'score',
  currentSearch: '',
  hasMore: true,
  loading: false,
  voteBalance: 0,
  searchTimer: null,

  async init() {
    Auth.init();
    this.bindEvents();
    this.renderRulesMd();
    this.updateAuthUI();
    this.checkSubmitAccess();
    if (Auth.isLoggedIn()) await this.refreshVoteBalance();
    await this.loadLeaderboard();
  },

  bindEvents() {
    // Tab 切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // 排序按钮
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchSort(btn.dataset.sort));
    });

    // 加载更多
    document.getElementById('btnLoadMore').addEventListener('click', () => this.loadMore());

    // 提交表单
    document.getElementById('submitForm').addEventListener('submit', e => this.handleSubmit(e));

    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));

    // 注册表单
    document.getElementById('registerForm').addEventListener('submit', e => this.handleRegister(e));

    // 编辑条目表单
    const editEntryForm = document.getElementById('editEntryForm');
    if (editEntryForm) editEntryForm.addEventListener('submit', e => this.handleEditEntry(e));

    // 弹窗关闭（点遮罩）
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal(overlay.id.replace('modal', '').toLowerCase());
      });
    });

    // ESC 关闭弹窗
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        for (const name of ['login', 'register', 'detail', 'editEntry']) {
          const el = document.getElementById(`modal${name.charAt(0).toUpperCase() + name.slice(1)}`);
          if (el && el.classList.contains('active')) { this.closeModal(name); break; }
        }
      }
    });

    // 搜索输入（防抖 300ms）
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          this.currentSearch = searchInput.value.trim();
          this.currentPage = 1;
          this.hasMore = true;
          this.loadLeaderboard();
        }, 300);
      });
    }

    // 管理员面板内 Tab 切换
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.admin-content').forEach(c => {
          const tabMap = { users: 'Users', entries: 'Entries', reports: 'Reports', staff: 'Staff' };
          c.classList.toggle('active', c.id === `admin${tabMap[tab.dataset.adminTab] || tab.dataset.adminTab}`);
        });
        if (tab.dataset.adminTab === 'users') Components.renderAdminUsers();
        else if (tab.dataset.adminTab === 'entries') Components.renderAdminEntries();
        else if (tab.dataset.adminTab === 'reports') Components.renderAdminReports();
        else if (tab.dataset.adminTab === 'staff') Components.renderAdminStaff();
      });
    });

    // owner 专属 tab 显示控制
    this.updateStaffOnlyTabs();
  },

  // ====== Tab & Sort ======
  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => {
      const idMap = { leaderboard: 'tabLeaderboard', submit: 'tabSubmit', admin: 'tabAdmin' };
      c.classList.toggle('active', c.id === idMap[tab]);
    });
    this.checkSubmitAccess();
    if (tab === 'admin') Components.renderAdminUsers();
  },

  switchSort(sort) {
    if (this.currentSort === sort) return;
    this.currentSort = sort;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
    this.currentPage = 1;
    this.hasMore = true;
    this.loadLeaderboard();
  },

  // ====== Markdown Rendering ======
  renderRulesMd() {
    const src = document.getElementById('rulesMd');
    const target = document.getElementById('rulesContent');
    if (src && target && window.marked) {
      target.innerHTML = marked.parse(src.textContent);
    }
  },
  updateAuthUI() {
    const nav = document.getElementById('navActions');
    const user = Auth.getUser();
    if (user) {
      nav.innerHTML = `
        <span class="nav-votes">🎫 <strong>${this.voteBalance}</strong> 票</span>
        <span class="nav-user">👤 ${Components.esc(user.username)}</span>
        <button class="btn btn-outline btn-sm" onclick="App.logout()">退出</button>
      `;
      // 管理员显示管理 tab
      const adminTab = document.querySelector('.tab.admin-only');
      if (adminTab) adminTab.style.display = (user.role === 'admin' || user.role === 'owner') ? '' : 'none';
      this.updateStaffOnlyTabs();
    } else {
      nav.innerHTML = `
        <button class="btn btn-outline btn-sm" onclick="App.showModal('login')">登录</button>
        <button class="btn btn-primary btn-sm" onclick="App.showModal('register')">注册</button>
      `;
      const adminTab = document.querySelector('.tab.admin-only');
      if (adminTab) adminTab.style.display = 'none';
    }
    this.updateStaffOnlyTabs();
  },

  async refreshVoteBalance() {
    if (!Auth.isLoggedIn()) return;
    try {
      const data = await API.getVoteBalance();
      this.voteBalance = data.vote_balance;
      this.updateAuthUI();
    } catch { /* ignore */ }
  },

  checkSubmitAccess() {
    const card = document.getElementById('submitCard');
    const hint = document.getElementById('submitLoginHint');
    if (Auth.isLoggedIn()) {
      card.style.display = '';
      hint.style.display = 'none';
    } else {
      card.style.display = 'none';
      hint.style.display = '';
    }
  },

  // owner 专属功能可见性
  updateStaffOnlyTabs() {
    const user = Auth.getUser();
    const isOwner = user && user.role === 'owner';
    document.querySelectorAll('.owner-only').forEach(el => {
      el.style.display = isOwner ? '' : 'none';
    });
  },

  // ====== Modal ======
  showModal(name) {
    document.getElementById(`modal${name.charAt(0).toUpperCase() + name.slice(1)}`).classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal(name) {
    document.getElementById(`modal${name.charAt(0).toUpperCase() + name.slice(1)}`).classList.remove('active');
    document.body.style.overflow = '';
  },

  switchModal(from, to) {
    this.closeModal(from);
    setTimeout(() => this.showModal(to), 150);
  },

  // ====== Auth Actions ======
  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      const data = await API.login(username, password);
      Auth.setSession(data.token, data.user);
      this.updateAuthUI();
      await this.refreshVoteBalance();
      this.checkSubmitAccess();
      this.closeModal('login');
      Components.showToast(`欢迎回来，${data.user.username}～`, 'success');
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    try {
      await API.register(username, password);
      Components.showToast('注册成功，请登录～', 'success');
      this.closeModal('register');
      setTimeout(() => this.showModal('login'), 300);
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  logout() {
    Auth.logout();
    this.updateAuthUI();
    this.checkSubmitAccess();
    Components.showToast('已退出登录', 'info');
    this.loadLeaderboard();
  },

  // ====== Entries ======
  async loadLeaderboard() {
    this.loading = true;
    try {
      const params = { page: 1, limit: 20, sort: this.currentSort };
      if (this.currentSearch) params.search = this.currentSearch;
      const data = await API.getEntries(params);
      const entries = data.entries;
      this.currentPage = data.page;
      this.hasMore = entries.length === data.limit && entries.length < data.total;
      document.getElementById('loadMore').classList.toggle('hidden', !this.hasMore);

      if (entries.length === 0) {
        document.getElementById('podium').innerHTML = '';
        document.getElementById('leaderboardList').innerHTML = '';
        document.getElementById('emptyState').style.display = '';
        document.getElementById('loadMore').classList.add('hidden');
      } else {
        document.getElementById('emptyState').style.display = 'none';
        Components.renderPodium(entries);
        // 剩下的从第4名开始
        const rest = entries.slice(3);
        Components.renderList(rest, 4);
      }

      Components.updateStats(entries, data.total);
    } catch (err) {
      Components.showToast('加载排行榜失败：' + err.message, 'error');
    }
    this.loading = false;
  },

  async loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    try {
      const page = this.currentPage + 1;
      const params = { page, limit: 20, sort: this.currentSort };
      if (this.currentSearch) params.search = this.currentSearch;
      const data = await API.getEntries(params);
      const entries = data.entries;
      if (entries.length === 0) { this.hasMore = false; document.getElementById('loadMore').classList.add('hidden'); return; }

      this.currentPage = page;
      this.hasMore = entries.length === data.limit;
      document.getElementById('loadMore').classList.toggle('hidden', !this.hasMore);

      const startRank = (page - 1) * 20 + 1;
      Components.renderList(entries, startRank);
    } catch (err) {
      Components.showToast('加载失败：' + err.message, 'error');
    }
    this.loading = false;
  },

  async handleSubmit(e) {
    e.preventDefault();
    if (!Auth.isLoggedIn()) {
      Components.showToast('请先登录喵～', 'error');
      return;
    }

    const name = document.getElementById('entryName').value.trim();
    const category = document.getElementById('entryCategory').value;
    const description = document.getElementById('entryDesc').value.trim();

    try {
      await API.createEntry({ name, category, description });
      Components.showToast('提交成功！已上榜～', 'success');
      document.getElementById('submitForm').reset();
      // 切换到排行榜
      this.switchTab('leaderboard');
      this.currentPage = 1;
      this.hasMore = true;
      await this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // 乐观更新：投票后不刷新整个榜单，直接更新 DOM
  updateEntryDOM(entryId, data) {
    // 更新列表中的条目卡片
    const card = document.querySelector(`.entry-card[data-entry-id="${entryId}"]`);
    if (card) {
      const btns = card.querySelectorAll(`[data-vote-btn="${entryId}"]`);
      btns.forEach(b => {
        b.classList.toggle('active-up', data.vote === 1);
        b.classList.toggle('active-down', data.vote === -1);
      });
      const barWrap = card.querySelector(`[data-entry-score="${entryId}"]`);
      if (barWrap) {
        const pct = Math.round(Math.max(0, Math.min(10, data.score)) / 10 * 100);
        const fill = barWrap.querySelector('.score-bar-fill');
        const num = barWrap.querySelector('.score-bar-num');
        if (fill) fill.style.width = pct + '%';
        if (num) num.textContent = data.score + '/10';
      }
    }
    // 更新 podium 卡片
    const podiumCard = document.querySelector(`.podium-card[data-entry-id="${entryId}"]`);
    if (podiumCard) {
      const barWrap = podiumCard.querySelector(`[data-entry-score="${entryId}"]`);
      if (barWrap) {
        const pct = Math.round(Math.max(0, Math.min(10, data.score)) / 10 * 100);
        const fill = barWrap.querySelector('.score-bar-fill');
        const num = barWrap.querySelector('.score-bar-num');
        if (fill) fill.style.width = pct + '%';
        if (num) num.textContent = data.score + '/10';
      }
    }
    // 更新详情模态框
    const detailStats = document.querySelector('#detailContent .detail-vote-stats');
    if (detailStats) {
      detailStats.innerHTML = `
        <span style="color:var(--green)">👍 ${data.up_votes || 0} 赞</span>
        <span style="color:var(--red)">👎 ${data.down_votes || 0} 踩</span>
      `;
    }
  },

  async vote(entryId, value) {
    if (!Auth.isLoggedIn()) {
      Components.showToast('登录后才能投票喵～', 'error');
      return;
    }
    try {
      const data = await API.vote(entryId, value);
      this.voteBalance = data.vote_balance;
      this.updateAuthUI();
      this.updateEntryDOM(entryId, data);
      const msg = data.vote === null ? '已取消投票' : `投票成功！剩余 ${data.vote_balance} 票`;
      Components.showToast(msg, 'success');
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async deleteEntry(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await API.deleteEntry(id);
      Components.showToast('删除成功', 'success');
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Detail Modal ======
  async showDetail(id) {
    // 立即显示模态框（加载中状态）
    document.getElementById('detailContent').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary)">加载中...</div>';
    this.showModal('detail');
    try {
      const entry = await API.getEntry(id);
      Components.renderDetail(entry);
    } catch (err) {
      document.getElementById('detailContent').innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">加载失败：${Components.esc(err.message)}</div>`;
    }
  },

  async voteFromDetail(id, value) {
    if (!Auth.isLoggedIn()) {
      Components.showToast('登录后才能投票喵～', 'error');
      return;
    }
    try {
      const data = await API.vote(id, value);
      this.voteBalance = data.vote_balance;
      this.updateAuthUI();
      this.updateEntryDOM(id, data);
      // 刷新详情模态框内容
      const entry = await API.getEntry(id);
      Components.renderDetail(entry);
      const msg = data.vote === null ? '已取消投票' : `投票成功！剩余 ${data.vote_balance} 票`;
      Components.showToast(msg, 'success');
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Admin ======
  async adminUpdateUser(id, field, value) {
    try {
      const body = {};
      body[field] = value;
      await API.adminUpdateUser(id, body);
      Components.showToast('用户已更新', 'success');
      Components.renderAdminUsers();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async adminUpdateVotes(id) {
    const val = document.getElementById(`voteBal${id}`).value;
    await this.adminUpdateUser(id, 'vote_balance', parseInt(val));
  },

  async adminDeleteUser(id) {
    if (!confirm('确定要删除该用户及其所有数据和投票吗？此操作不可撤销！')) return;
    try {
      await API.adminDeleteUser(id);
      Components.showToast('用户已删除', 'success');
      Components.renderAdminUsers();
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async adminDeleteEntry(id) {
    if (!confirm('确定要删除该条目吗？')) return;
    try {
      await API.adminDeleteEntry(id);
      Components.showToast('条目已删除', 'success');
      Components.renderAdminEntries();
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Admin Edit Entry ======
  async showEditEntry(id) {
    try {
      const entry = await API.getEntry(id);
      document.getElementById('editEntryId').value = entry.id;
      document.getElementById('editEntryName').value = entry.name;
      document.getElementById('editEntryCategory').value = entry.category;
      document.getElementById('editEntryDesc').value = entry.description;
      document.getElementById('editEntryScore').value = entry.score;
      this.showModal('editEntry');
    } catch (err) {
      Components.showToast('加载条目信息失败：' + err.message, 'error');
    }
  },

  async handleEditEntry(e) {
    e.preventDefault();
    const id = document.getElementById('editEntryId').value;
    const name = document.getElementById('editEntryName').value.trim();
    const category = document.getElementById('editEntryCategory').value;
    const description = document.getElementById('editEntryDesc').value.trim();
    const score = parseInt(document.getElementById('editEntryScore').value);

    try {
      await API.adminUpdateEntry(id, { name, category, description, score });
      Components.showToast('条目已更新喵～', 'success');
      this.closeModal('editEntry');
      Components.renderAdminEntries();
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Report ======
  async reportEntry(entryId) {
    if (!Auth.isLoggedIn()) {
      Components.showToast('请先登录喵～', 'error');
      return;
    }
    const reason = prompt('请输入投诉理由（如内容不当、侵犯隐私等）：');
    if (!reason || !reason.trim()) return;
    try {
      await API.createReport(entryId, reason.trim());
      Components.showToast('投诉已提交，管理员将尽快处理喵～', 'success');
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Manage Submitter from Detail ======
  async manageSubmitter(entryId) {
    try {
      const entry = await API.getEntry(entryId);
      if (!entry.submitted_by) {
        Components.showToast('该条目没有关联用户（可能已被删除）', 'error');
        return;
      }
      // 获取提交者信息
      const data = await API.adminGetUsers();
      const submitter = data.users.find(u => u.id === entry.submitted_by);
      if (!submitter) {
        Components.showToast('提交者不存在', 'error');
        return;
      }
      const action = prompt(
        `管理用户: ${submitter.username} (ID: ${submitter.id})\n角色: ${submitter.role}\n票数: ${submitter.vote_balance}\n\n输入操作:\n  ban — 封禁用户（设为 unauthorized）\n  unban — 解封用户（设为 user）\n  delete — 删除该用户及所有数据`
      );
      if (!action) return;
      switch (action.trim().toLowerCase()) {
        case 'ban':
          if (!confirm(`确定要封禁用户 ${submitter.username} 吗？`)) return;
          await API.adminUpdateUser(submitter.id, { role: 'unauthorized' });
          Components.showToast(`用户 ${submitter.username} 已被封禁`, 'success');
          break;
        case 'unban':
          await API.adminUpdateUser(submitter.id, { role: 'user' });
          Components.showToast(`用户 ${submitter.username} 已解封`, 'success');
          break;
        case 'delete':
          if (!confirm(`确定要删除用户 ${submitter.username} 及其所有数据吗？此操作不可撤销！`)) return;
          await API.adminDeleteUser(submitter.id);
          Components.showToast('用户已删除', 'success');
          this.closeModal('detail');
          this.loadLeaderboard();
          break;
        default:
          Components.showToast('无效操作，请输入 ban / unban / delete', 'error');
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Report Resolution ======
  async resolveReport(id, status) {
    const resolution = status === 'resolved' ? '投诉有效，已处理' : '投诉无效，已驳回';
    try {
      await API.adminResolveReport(id, { status, resolution });
      Components.showToast(status === 'resolved' ? '投诉已通过' : '投诉已驳回', 'success');
      Components.renderAdminReports();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
