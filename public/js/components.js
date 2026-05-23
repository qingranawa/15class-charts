// public/js/components.js — UI 组件渲染

const Components = {
  _pages: {},
  _lastCheckbox: null,
  _cache: {},

  clearCache(key) {
    if (key) { delete this._cache[key]; }
    else { this._cache = {}; }
  },

  categoryLabel(cat) {
    const map = { classmate: '同学', colleague: '同事', stranger: '路人', family: '家人', other: '其他' };
    return map[cat] || cat;
  },

  rankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  },

  timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr + 'Z').getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  },

  // 封禁按钮组（折叠式）
  banButtons(userId, showUnban = false) {
    const durations = [
      { label: '5h', dur: '5h' },
      { label: '1d', dur: '1d' },
      { label: '3d', dur: '3d' },
      { label: '7d', dur: '7d' },
      { label: '14d', dur: '14d' },
      { label: '1m', dur: '1m' },
      { label: '50y', dur: '50y', red: true },
    ];
    const banBtns = durations.map(d =>
      `<button class="btn btn-sm btn-outline" ${d.red ? 'style="color:var(--red)"' : ''} onclick="event.stopPropagation(); App.banUser(${userId}, '${d.dur}')">${d.label}</button>`
    ).join('');
    const unbanBtn = showUnban
      ? `<button class="btn btn-sm btn-outline" style="color:var(--green)" onclick="event.stopPropagation(); App.unbanUser(${userId})">解封</button>`
      : '';
    return `<button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); App.toggleBanBtns(this)">🔒 封禁</button><span class="ban-btn-inline" style="display:none">${banBtns}${unbanBtn}</span>`;
  },

  renderPodium(entries) {
    const podium = document.getElementById('podium');
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) { podium.innerHTML = ''; return; }

    podium.innerHTML = top3.map((e, i) => `
      <div class="podium-card rank-${i + 1}" data-entry-id="${e.id}" onclick="App.showDetail(${e.id})">
        <div class="podium-rank">${this.rankEmoji(i + 1)}</div>
        <div class="podium-name">${this.esc(e.name)}</div>
        <div class="podium-desc">${this.esc(e.description)}</div>
        ${this.scoreBar(e.score, '', e.id)}
      </div>
    `).join('');
  },

  renderList(entries, startRank) {
    const list = document.getElementById('leaderboardList');
    const user = Auth.getUser();

    const html = entries.map((e, i) => {
      const rank = startRank + i;
      return `
        <div class="entry-card" data-entry-id="${e.id}" style="animation-delay:${i * 0.04}s" onclick="App.showDetail(${e.id})">
          <div class="entry-rank-num">${rank <= 3 ? this.rankEmoji(rank) : '#' + rank}</div>
          <div class="entry-info">
            <div class="entry-name">${this.esc(e.name)}</div>
            <div class="entry-desc">${this.esc(e.description)}</div>
            <div class="entry-meta">
              <span>${this.categoryLabel(e.category)}</span>
              ${e.submitter ? `<span>来自 ${this.esc(e.submitter)}</span>` : ''}
              <span>${this.timeAgo(e.created_at)}</span>
            </div>
          </div>
          <div class="entry-votes" onclick="event.stopPropagation()">
            <button class="btn-vote ${e.user_vote === 1 ? 'active-up' : ''}" data-vote-btn="${e.id}" onclick="App.vote(${e.id}, 1)" title="赞">👍</button>
            ${this.scoreBar(e.score, '', e.id)}
            <button class="btn-vote ${e.user_vote === -1 ? 'active-down' : ''}" data-vote-btn="${e.id}" onclick="App.vote(${e.id}, -1)" title="踩">👎</button>
          </div>
          ${user && e.submitted_by === user.id ? `
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); App.deleteEntry(${e.id})" title="删除">🗑</button>
          ` : ''}
        </div>
      `;
    }).join('');

    if (startRank === 4) {
      list.innerHTML = html;
    } else {
      list.insertAdjacentHTML('beforeend', html);
    }
  },

  showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  updateStats(entries, total) {
    document.getElementById('statEntries').textContent = total || '0';
    const totalVotes = entries.reduce((s, e) => s + (e.up_votes || 0) + (e.down_votes || 0), 0);
    document.getElementById('statVotes').textContent = totalVotes;
  },

  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  toggleCheckAll(group, masterCheckbox) {
    const checked = masterCheckbox.checked;
    document.querySelectorAll(`.check-${group}`).forEach(cb => { cb.checked = checked; });
    this.updateBatchBar(group);
  },

  updateBatchBar(group) {
    const checked = document.querySelectorAll(`.check-${group}:checked`).length;
    const barId = group === 'adminUsers' ? 'adminBatchBar' : 'myEntriesBatchBar';
    const countId = group === 'adminUsers' ? 'adminBatchCount' : 'myEntriesBatchCount';
    const bar = document.getElementById(barId);
    const count = document.getElementById(countId);
    if (bar) bar.style.display = checked > 0 ? '' : 'none';
    if (count) count.textContent = `已选 ${checked} 项`;
  },

  getCheckedIds(group) {
    return [...document.querySelectorAll(`.check-${group}:checked`)].map(cb => parseInt(cb.value));
  },

  // 分页：每页 20 行
  paginateData(data, key) {
    const page = this._pages[key] || 1;
    const start = (page - 1) * 20;
    return { pageData: data.slice(start, start + 20), page, totalPages: Math.ceil(data.length / 20) };
  },

  renderPaginationBar(key, totalPages, page) {
    if (totalPages <= 1) return '';
    let html = '<div class="pagination-bar">';
    html += `<button class="btn btn-sm btn-outline" onclick="Components.goToPage('${key}', ${page - 1})" ${page <= 1 ? 'disabled' : ''}>◀ 上一页</button>`;
    html += `<span class="page-info">第 ${page} / ${totalPages} 页</span>`;
    html += `<button class="btn btn-sm btn-outline" onclick="Components.goToPage('${key}', ${page + 1})" ${page >= totalPages ? 'disabled' : ''}>下一页 ▶</button>`;
    html += '</div>';
    return html;
  },

  goToPage(key, page) {
    this._pages[key] = page;
    const master = document.getElementById(`${key}CheckAll`);
    if (master) master.checked = false;
    this.updateBatchBar(key === 'myEntries' ? 'myEntries' : 'adminUsers');
    // 动画
    const tbody = document.querySelector(`#${key === 'myEntries' ? 'myEntriesTable' : key === 'adminUsers' ? 'adminUsersTable' : key === 'adminEntries' ? 'adminEntriesTable' : key === 'adminReports' ? 'adminReportsTable' : key === 'adminStaff' ? 'adminStaffTable' : 'adminDeletedTable'} tbody`);
    if (tbody) {
      tbody.classList.add('switching');
      setTimeout(() => tbody.classList.remove('switching'), 150);
    }
    const renderMap = {
      adminUsers: () => Components.renderAdminUsers(document.getElementById('adminSearchInput')?.value?.trim() || ''),
      adminEntries: () => Components.renderAdminEntries(),
      adminReports: () => Components.renderAdminReports(),
      adminStaff: () => Components.renderAdminStaff(),
      adminDeleted: () => Components.renderDeletedEntries(),
      myEntries: () => Components.renderMyEntries(),
    };
    if (renderMap[key]) renderMap[key]();
  },

  // Shift 区间复选
  handleCheckClick(e, group) {
    if (e.shiftKey && this._lastCheckbox && this._lastCheckbox.group === group) {
      const checkboxes = [...document.querySelectorAll(`.check-${group}`)];
      const start = checkboxes.indexOf(this._lastCheckbox.el);
      const end = checkboxes.indexOf(e.target);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        for (let i = from; i <= to; i++) checkboxes[i].checked = e.target.checked;
      }
    }
    this._lastCheckbox = { el: e.target, group };
    this.updateBatchBar(group);
  },

  scoreBar(score, cls = '', entryId = '') {
    const pct = Math.round(Math.max(0, Math.min(10, score)) / 10 * 100);
    const attr = entryId ? ` data-entry-score="${entryId}"` : '';
    return `<span class="score-bar-wrap ${cls}"${attr}><span class="score-bar"><span class="score-bar-fill" style="width:${pct}%"></span></span><span class="score-bar-num">${score}/10</span></span>`;
  },

  renderDetail(entry) {
    const ct = document.getElementById('detailContent');
    const user = Auth.getUser();
    const isStaff = user && (user.role === 'admin' || user.role === 'owner');
    ct.innerHTML = `
      <div class="detail-header">
        <div class="detail-name">${this.esc(entry.name)}</div>
        <span class="detail-category">${this.categoryLabel(entry.category)}</span>
      </div>
      ${this.scoreBar(entry.score, 'detail-score-bar', entry.id)}
      <div class="detail-vote-stats">
        <span style="color:var(--green)">👍 ${entry.up_votes || 0} 赞</span>
        <span style="color:var(--red)">👎 ${entry.down_votes || 0} 踩</span>
      </div>
      <div class="detail-votes">
        <button class="btn-vote ${entry.user_vote === 1 ? 'active-up' : ''}" data-vote-btn="${entry.id}" onclick="App.voteFromDetail(${entry.id}, 1)">👍</button>
        <button class="btn-vote ${entry.user_vote === -1 ? 'active-down' : ''}" data-vote-btn="${entry.id}" onclick="App.voteFromDetail(${entry.id}, -1)">👎</button>
      </div>
      <div class="detail-desc">${this.esc(entry.description)}</div>
      <div class="detail-meta">
        提交者：${this.esc(entry.submitter || '未知')} · ${this.timeAgo(entry.created_at)}
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline btn-sm" onclick="App.reportEntry(${entry.id})">🚩 投诉</button>
        ${isStaff ? `<button class="btn btn-outline btn-sm" onclick="App.manageSubmitter(${entry.id})" style="margin-left:8px">👤 管理提交者</button>` : ''}
      </div>
    `;
  },

  async renderAdminUsers(filterText = '') {
    try {
      let users;
      if (!filterText && this._cache.adminUsers) {
        users = this._cache.adminUsers;
      } else {
        const data = await API.adminGetUsers();
        users = data.users;
        if (!filterText) this._cache.adminUsers = users;
      }
      if (filterText) {
        const f = filterText.toLowerCase();
        users = users.filter(u => u.username.toLowerCase().includes(f) || String(u.id).includes(f));
      }
      const tbody = document.querySelector('#adminUsersTable tbody');
      const currentUser = Auth.getUser();
      const isOwner = currentUser && currentUser.role === 'owner';
      const { pageData, page, totalPages } = this.paginateData(users, 'adminUsers');
      tbody.innerHTML = pageData.map(u => {
        const isTargetOwner = u.role === 'owner';
        const canManage = isOwner || (!isTargetOwner && u.id !== currentUser.id);
        return `
        <tr>
          <td><input type="checkbox" class="check-adminUsers" value="${u.id}" onclick="Components.handleCheckClick(event, 'adminUsers')"></td>
          <td>${u.id}</td>
          <td>${this.esc(u.username)}</td>
          <td>
            ${canManage ? `
              <select onchange="App.adminUpdateUser(${u.id}, 'role', this.value)">
                <option value="unauthorized" ${u.role === 'unauthorized' ? 'selected' : ''}>unauthorized</option>
                <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                ${isOwner ? `<option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>` : ''}
                ${isOwner ? `<option value="owner" ${u.role === 'owner' ? 'selected' : ''}>owner</option>` : ''}
              </select>
            ` : `<span class="role-badge ${u.role}">${u.role}</span>`}
          </td>
          <td>
            <span class="admin-inline-form">
              <input type="number" value="${u.vote_balance}" min="0" style="width:60px" id="voteBal${u.id}">
              <button class="btn btn-sm btn-outline" onclick="App.adminUpdateVotes(${u.id})">保存</button>
            </span>
          </td>
          <td>${this.timeAgo(u.created_at)}</td>
          <td style="white-space:nowrap">
            ${canManage ? `
              ${this.banButtons(u.id, u.role === 'unauthorized')}
              <button class="btn btn-sm btn-outline" onclick="App.adminDeleteUser(${u.id})" style="color:var(--red);margin-left:4px">🗑</button>
            ` : `<span style="font-size:0.8rem;color:var(--gold)">👑</span>`}
          </td>
        </tr>
      `}).join('');
      // 分页控件
      const wrap = document.getElementById('adminUsersTable').closest('.admin-table-wrap');
      wrap.querySelectorAll('.pagination-bar').forEach(e => e.remove());
      wrap.insertAdjacentHTML('beforeend', this.renderPaginationBar('adminUsers', totalPages, page));
    } catch (err) {
      Components.showToast('加载用户列表失败：' + err.message, 'error');
    }
  },

  async renderAdminEntries() {
    try {
      let entries;
      if (this._cache.adminEntries) {
        entries = this._cache.adminEntries;
      } else {
        const data = await API.getEntries({ limit: 200, sort: 'newest' });
        entries = data.entries;
        this._cache.adminEntries = entries;
      }
      const tbody = document.querySelector('#adminEntriesTable tbody');
      const { pageData, page, totalPages } = this.paginateData(entries, 'adminEntries');
      tbody.innerHTML = pageData.map(e => `
        <tr>
          <td>${e.id}</td>
          <td>${this.esc(e.name)}</td>
          <td>${e.score}/10</td>
          <td>${this.esc(e.submitter || '-')}</td>
          <td>${this.timeAgo(e.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="App.showEditEntry(${e.id})" style="margin-right:4px">编辑</button>
            <button class="btn btn-sm btn-outline" onclick="App.adminDeleteEntry(${e.id})" style="color:var(--red)">删除</button>
          </td>
        </tr>
      `).join('');
      const wrap = document.getElementById('adminEntriesTable').closest('.admin-table-wrap');
      wrap.querySelectorAll('.pagination-bar').forEach(e => e.remove());
      wrap.insertAdjacentHTML('beforeend', this.renderPaginationBar('adminEntries', totalPages, page));
    } catch (err) {
      Components.showToast('加载条目列表失败：' + err.message, 'error');
    }
  },

  async renderAdminReports() {
    try {
      let reports;
      if (this._cache.adminReports) {
        reports = this._cache.adminReports;
      } else {
        const data = await API.adminGetReports();
        reports = data.reports;
        this._cache.adminReports = reports;
      }
      const tbody = document.querySelector('#adminReportsTable tbody');
      const { pageData, page, totalPages } = this.paginateData(reports, 'adminReports');
      const statusMap = { pending: '⏳ 待处理', resolved: '✅ 已处理', dismissed: '❌ 已驳回' };
      tbody.innerHTML = pageData.map(r => {
        const isPending = r.status === 'pending';
        const submitterId = r.submitted_by;
        return `
        <tr>
          <td>${r.id}</td>
          <td>${this.esc(r.entry_name || '已删除')}</td>
          <td>${this.esc(r.reporter_name || '-')}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.esc(r.reason)}">${this.esc(r.reason)}</td>
          <td>${statusMap[r.status] || r.status}</td>
          <td>${this.timeAgo(r.created_at)}</td>
          <td style="white-space:nowrap">
            ${isPending ? `
              <button class="btn btn-sm btn-outline" onclick="App.handleReportEdit(${r.entry_id}, ${r.id})" style="margin-right:4px">✏️ 修改</button>
              <button class="btn btn-sm btn-outline" onclick="App.handleReportDelete(${r.entry_id}, ${r.id})" style="color:var(--red);margin-right:4px">🗑 下架</button>
              <button class="btn btn-sm btn-outline" onclick="App.resolveReport(${r.id}, 'dismissed')" style="margin-right:4px">⛔ 驳回</button>
              ${submitterId ? `
                <button class="btn btn-sm btn-outline" onclick="App.toggleBanBtns(this)">👤 管理${this.esc(r.submitter_name || '提交者')}</button>
                <span class="ban-btn-inline" style="display:none;flex-wrap:wrap;gap:3px;margin-top:4px">${this.banButtons(submitterId, true)}</span>
              ` : ''}
            ` : `<span style="font-size:0.8rem;color:var(--text-muted)">${this.esc(r.resolver_name || '')} · ${r.resolution || ''}</span>`}
          </td>
        </tr>
      `}).join('');
      const wrap2 = document.getElementById('adminReportsTable').closest('.admin-table-wrap');
      wrap2.querySelectorAll('.pagination-bar').forEach(e => e.remove());
      wrap2.insertAdjacentHTML('beforeend', this.renderPaginationBar('adminReports', totalPages, page));
    } catch (err) {
      Components.showToast('加载投诉列表失败：' + err.message, 'error');
    }
  },

  async renderAdminStaff() {
    try {
      let users;
      if (this._cache.adminUsers) {
        users = this._cache.adminUsers;
      } else {
        const data = await API.adminGetUsers();
        users = data.users;
        this._cache.adminUsers = users;
      }
      const staff = users.filter(u => u.role === 'admin' || u.role === 'owner');
      const { pageData, page, totalPages } = this.paginateData(staff, 'adminStaff');
      const tbody = document.querySelector('#adminStaffTable tbody');
      const currentUser = Auth.getUser();
      const isOwner = currentUser && currentUser.role === 'owner';
      tbody.innerHTML = pageData.map(u => `
        <tr>
          <td><input type="checkbox" class="check-adminStaff" value="${u.id}" onclick="Components.handleCheckClick(event, 'adminStaff')"></td>
          <td>${u.id}</td>
          <td>${this.esc(u.username)}</td>
          <td>
            ${isOwner && u.role !== 'owner' ? `
              <select onchange="App.adminUpdateUser(${u.id}, 'role', this.value)">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                <option value="unauthorized" ${u.role === 'unauthorized' ? 'selected' : ''}>unauthorized</option>
              </select>
            ` : `<span class="role-badge ${u.role}">${u.role}</span>`}
          </td>
          <td>${u.vote_balance}</td>
          <td>${this.timeAgo(u.created_at)}</td>
          <td>
            ${isOwner && u.role !== 'owner' ? `
              <button class="btn btn-sm btn-outline" onclick="App.adminDeleteUser(${u.id})" style="color:var(--red)">🗑</button>
            ` : u.role === 'owner' ? '<span style="font-size:0.8rem;color:var(--gold)">👑 所有者</span>' : '-'}
          </td>
        </tr>
      `).join('');
      const wrap3 = document.getElementById('adminStaffTable').closest('.admin-table-wrap');
      wrap3.querySelectorAll('.pagination-bar').forEach(e => e.remove());
      wrap3.insertAdjacentHTML('beforeend', this.renderPaginationBar('adminStaff', totalPages, page));
    } catch (err) {
      Components.showToast('加载管理人员列表失败：' + err.message, 'error');
    }
  },

  async renderDeletedEntries() {
    try {
      const data = await API.adminGetDeletedEntries();
      const tbody = document.querySelector('#adminDeletedTable tbody');
      const { pageData, page, totalPages } = this.paginateData(data.entries, 'adminDeleted');
      tbody.innerHTML = pageData.map(e => `
        <tr>
          <td>${e.id}</td>
          <td>${this.esc(e.name)}</td>
          <td>${e.score}/10</td>
          <td>${this.esc(e.submitter || '-')}</td>
          <td>${this.timeAgo(e.deleted_at)}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-outline" onclick="App.restoreEntry(${e.id})" style="color:var(--green);margin-right:4px">🔄 恢复</button>
            <button class="btn btn-sm btn-outline" onclick="App.permanentDeleteEntry(${e.id})" style="color:var(--red)">🔥 永久删除</button>
          </td>
        </tr>
      `).join('');
      if (data.entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">回收站为空喵～</td></tr>';
      } else {
        const wrap4 = document.getElementById('adminDeletedTable').closest('.admin-table-wrap');
        wrap4.querySelectorAll('.pagination-bar').forEach(e => e.remove());
        wrap4.insertAdjacentHTML('beforeend', this.renderPaginationBar('adminDeleted', totalPages, page));
      }
    } catch (err) {
      Components.showToast('加载已删条目失败：' + err.message, 'error');
    }
  },

  async renderMyEntries() {
    try {
      const data = await API.getEntries({ limit: 100, sort: 'newest' });
      const userId = Auth.getUser()?.id;
      const myEntries = data.entries.filter(e => e.submitted_by === userId);
      const { pageData, page, totalPages } = this.paginateData(myEntries, 'myEntries');
      const tbody = document.querySelector('#myEntriesTable tbody');
      const user = Auth.getUser();
      const canEdit = user && user.role !== 'unauthorized';
      tbody.innerHTML = pageData.map(e => `
        <tr>
          <td><input type="checkbox" class="check-myEntries" value="${e.id}" onclick="Components.handleCheckClick(event, 'myEntries')"></td>
          <td>${e.id}</td>
          <td>${this.esc(e.name)}</td>
          <td>${e.score}/10</td>
          <td>${this.categoryLabel(e.category)}</td>
          <td>${this.timeAgo(e.created_at)}</td>
          <td style="white-space:nowrap">
            ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="App.showEditEntry(${e.id})" style="margin-right:4px">编辑</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="App.deleteEntry(${e.id})" style="color:var(--red)">删除</button>
          </td>
        </tr>
      `).join('');
      if (myEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">还没有上传过人物喵～</td></tr>';
      } else {
        const wrap5 = document.getElementById('myEntriesTable').closest('.admin-table-wrap');
        wrap5.querySelectorAll('.pagination-bar').forEach(e => e.remove());
        wrap5.insertAdjacentHTML('beforeend', this.renderPaginationBar('myEntries', totalPages, page));
      }
    } catch (err) {
      Components.showToast('加载失败：' + err.message, 'error');
    }
  },
};
