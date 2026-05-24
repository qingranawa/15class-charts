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
        for (const name of ['detail', 'editEntry']) {
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
          const tabMap = { users: 'Users', entries: 'Entries', reports: 'Reports', staff: 'Staff', deleted: 'Deleted' };
          c.classList.toggle('active', c.id === `admin${tabMap[tab.dataset.adminTab] || tab.dataset.adminTab}`);
        });
        if (tab.dataset.adminTab === 'users') Components.renderAdminUsers();
        else if (tab.dataset.adminTab === 'entries') Components.renderAdminEntries();
        else if (tab.dataset.adminTab === 'reports') Components.renderAdminReports();
        else if (tab.dataset.adminTab === 'staff') Components.renderAdminStaff();
        else if (tab.dataset.adminTab === 'deleted') Components.renderDeletedEntries();
      });
    });

    // 管理面板搜索用户
    const adminSearch = document.getElementById('adminSearchInput');
    if (adminSearch) {
      adminSearch.addEventListener('input', () => {
        Components._pages.adminUsers = 1;
        Components.renderAdminUsers(adminSearch.value.trim());
      });
    }

    // owner 专属 tab 显示控制
    this.updateStaffOnlyTabs();
  },

  // ====== Tab & Sort ======
  switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => {
      const idMap = { leaderboard: 'tabLeaderboard', submit: 'tabSubmit', account: 'tabAccount', admin: 'tabAdmin' };
      c.classList.toggle('active', c.id === idMap[tab]);
    });
    this.checkSubmitAccess();
    if (tab === 'account') { this.renderAccountTab(); Components.renderMyEntries(); }
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
        <button class="btn btn-outline btn-sm" onclick="App.switchTab('account')">👤 账户</button>
        <button class="btn btn-outline btn-sm" onclick="App.logout()">退出</button>
      `;
      // 管理员显示管理 tab
      const adminTab = document.querySelector('.tab.admin-only');
      if (adminTab) adminTab.style.display = (user.role === 'admin' || user.role === 'owner') ? '' : 'none';
      // 登录用户显示「我上传的」tab
      const loginTabs = document.querySelectorAll('.tab.login-only');
      loginTabs.forEach(t => { t.style.display = ''; });
      this.updateStaffOnlyTabs();
    } else {
      nav.innerHTML = `
        <a href="/login.html" class="btn btn-outline btn-sm">登录</a>
        <a href="/register.html" class="btn btn-primary btn-sm">注册</a>
      `;
      const adminTab = document.querySelector('.tab.admin-only');
      if (adminTab) adminTab.style.display = 'none';
      const loginTabs = document.querySelectorAll('.tab.login-only');
      loginTabs.forEach(t => { t.style.display = 'none'; });
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
    const overlay = document.getElementById(`modal${name.charAt(0).toUpperCase() + name.slice(1)}`);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // 聚焦弹窗内的第一个输入框喵～
    const firstInput = overlay.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 400);
  },

  closeModal(name) {
    const overlay = document.getElementById(`modal${name.charAt(0).toUpperCase() + name.slice(1)}`);
    overlay.classList.remove('active');
    // 等过渡动画播完再恢复滚动喵～
    setTimeout(() => {
      if (!document.querySelector('.modal-overlay.active')) {
        document.body.style.overflow = '';
      }
    }, 400);
  },

  switchModal(from, to) {
    this.closeModal(from);
    setTimeout(() => this.showModal(to), 350);
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

  // 账户页改密（使用 account tab 内的表单）喵～
  async handleAccountChangePassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('acctOldPassword').value;
    const newPassword = document.getElementById('acctNewPassword').value;
    const confirmPassword = document.getElementById('acctConfirmPassword').value;
    if (newPassword !== confirmPassword) {
      Components.showToast('两次输入的新密码不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      Components.showToast('新密码至少 6 个字符', 'error');
      return;
    }
    try {
      await API.changePassword(oldPassword, newPassword);
      Components.showToast('密码修改成功喵～', 'success');
      document.getElementById('accountChangePasswordForm').reset();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // 渲染账户 tab 信息喵～
  renderAccountTab() {
    const user = Auth.getUser();
    if (!user) return;
    document.getElementById('accountUsername').textContent = user.username;
    document.getElementById('accountVotes').textContent = this.voteBalance;
    // 角色标签
    const roleEl = document.getElementById('accountRole');
    const roleLabels = { owner: '所有者', admin: '管理员', user: '普通用户', unauthorized: '已封禁' };
    roleEl.textContent = roleLabels[user.role] || user.role;
    roleEl.className = `account-info-value role-badge ${user.role}`;
    // 注册时间 — 从 JWT 解码 iat
    try {
      let payload = Auth._token.split('.')[1];
      payload = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4) payload += '=';
      const data = JSON.parse(Auth._safeAtob(payload));
      if (data.iat) {
        document.getElementById('accountRegTime').textContent = new Date(data.iat).toLocaleString('zh-CN');
      }
    } catch { document.getElementById('accountRegTime').textContent = '--'; }
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
      Components.clearCache('adminUsers');
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
      Components.clearCache('adminUsers');
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
      Components.clearCache('adminEntries');
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
      // 非管理员不能改分数
      const user = Auth.getUser();
      const isStaff = user && (user.role === 'admin' || user.role === 'owner');
      document.getElementById('editEntryScore').closest('.form-group').style.display = isStaff ? '' : 'none';
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
    const body = { name, category, description };
    const user = Auth.getUser();
    const isStaff = user && (user.role === 'admin' || user.role === 'owner');
    if (isStaff) {
      body.score = parseInt(document.getElementById('editEntryScore').value);
    }

    try {
      await API.adminUpdateEntry(id, body);
      Components.clearCache('adminEntries');
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
      location.href = '/login.html';
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
      // 在详情模态框底部展开封禁选项
      const actionsDiv = document.querySelector('.detail-actions');
      if (actionsDiv) {
        const existing = document.getElementById('detailBanBtns');
        if (existing) { existing.remove(); return; }
        const div = document.createElement('div');
        div.id = 'detailBanBtns';
        div.style.cssText = 'margin-top:12px;display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
        div.innerHTML = Components.banButtons(entry.submitted_by, true);
        actionsDiv.after(div);
      }
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Ban ======
  async banUser(id, duration) {
    if (!confirm(`确定封禁用户 ${duration} 吗？`)) return;
    try {
      await API.adminBanUser(id, duration);
      Components.showToast(`已封禁 ${duration}`, 'success');
      Components.clearCache('adminUsers');
      Components.renderAdminUsers();
      Components.renderAdminStaff();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async unbanUser(id) {
    if (!confirm('确定解封该用户吗？')) return;
    try {
      await API.adminUnbanUser(id);
      Components.showToast('已解封', 'success');
      Components.clearCache('adminUsers');
      Components.renderAdminUsers();
      Components.renderAdminStaff();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  toggleBanBtns(btn) {
    const span = btn.nextElementSibling;
    if (span) span.style.display = span.style.display === 'none' ? 'flex' : 'none';
  },

  // ====== Report Resolution ======
  async handleReportEdit(entryId, reportId) {
    // 自动将投诉标记为已处理，然后打开编辑
    try { await API.adminResolveReport(reportId, { status: 'resolved', resolution: '已修改内容' }); } catch {}
    Components.showToast('投诉已自动标记为已处理', 'info');
    this.showEditEntry(entryId);
  },

  async handleReportDelete(entryId, reportId) {
    if (!confirm('确定下架删除该条目吗？')) return;
    try {
      await API.adminDeleteEntry(entryId);
      try { await API.adminResolveReport(reportId, { status: 'resolved', resolution: '已下架删除' }); } catch {}
      Components.clearCache('adminReports');
      Components.clearCache('adminEntries');
      Components.showToast('已下架删除', 'success');
      Components.renderAdminReports();
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async resolveReport(id, status) {
    const resolution = status === 'resolved' ? '投诉已处理' : '投诉已驳回';
    try {
      await API.adminResolveReport(id, { status, resolution });
      Components.clearCache('adminReports');
      Components.showToast(status === 'resolved' ? '已处理' : '已驳回', 'success');
      Components.renderAdminReports();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Recycle Bin ======
  async restoreEntry(id) {
    if (!confirm('确定恢复该条目吗？')) return;
    try {
      await API.adminRestoreEntry(id);
      Components.clearCache('adminDeleted');
      Components.showToast('条目已恢复', 'success');
      Components.renderDeletedEntries();
      this.loadLeaderboard();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  async permanentDeleteEntry(id) {
    if (!confirm('永久删除后无法恢复，确定吗？')) return;
    try {
      await API.adminPermanentDeleteEntry(id);
      Components.clearCache('adminDeleted');
      Components.showToast('已永久删除', 'success');
      Components.renderDeletedEntries();
    } catch (err) {
      Components.showToast(err.message, 'error');
    }
  },

  // ====== Batch Operations ======
  async batchBanUsers(duration) {
    const ids = Components.getCheckedIds('adminUsers');
    if (ids.length === 0) { Components.showToast('请先选择用户', 'error'); return; }
    if (!confirm(`确定批量封禁 ${ids.length} 个用户 ${duration} 吗？`)) return;
    try {
      for (const id of ids) { await API.adminBanUser(id, duration); }
      Components.clearCache('adminUsers');
      Components.showToast(`已封禁 ${ids.length} 个用户`, 'success');
      Components.renderAdminUsers();
      document.getElementById('adminUsersCheckAll').checked = false;
    } catch (err) { Components.showToast(err.message, 'error'); }
  },

  async batchUnbanUsers() {
    const ids = Components.getCheckedIds('adminUsers');
    if (ids.length === 0) { Components.showToast('请先选择用户', 'error'); return; }
    if (!confirm(`确定批量解封 ${ids.length} 个用户吗？`)) return;
    try {
      for (const id of ids) { await API.adminUnbanUser(id); }
      Components.showToast(`已解封 ${ids.length} 个用户`, 'success');
      Components.renderAdminUsers();
      document.getElementById('adminUsersCheckAll').checked = false;
    } catch (err) { Components.showToast(err.message, 'error'); }
  },

  async batchDeleteUsers() {
    const ids = Components.getCheckedIds('adminUsers');
    if (ids.length === 0) { Components.showToast('请先选择用户', 'error'); return; }
    if (!confirm(`确定删除 ${ids.length} 个用户及其所有数据吗？此操作不可撤销！`)) return;
    try {
      for (const id of ids) { await API.adminDeleteUser(id); }
      Components.showToast(`已删除 ${ids.length} 个用户`, 'success');
      Components.renderAdminUsers();
      document.getElementById('adminUsersCheckAll').checked = false;
    } catch (err) { Components.showToast(err.message, 'error'); }
  },

  async batchDeleteMyEntries() {
    const ids = Components.getCheckedIds('myEntries');
    if (ids.length === 0) { Components.showToast('请先选择条目', 'error'); return; }
    if (!confirm(`确定删除 ${ids.length} 个条目吗？`)) return;
    try {
      for (const id of ids) { await API.deleteEntry(id); }
      Components.showToast(`已删除 ${ids.length} 个条目`, 'success');
      Components.renderMyEntries();
      this.loadLeaderboard();
      document.getElementById('myEntriesCheckAll').checked = false;
    } catch (err) { Components.showToast(err.message, 'error'); }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
