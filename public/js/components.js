// public/js/components.js — UI 组件渲染

const Components = {
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

  renderPodium(entries) {
    const podium = document.getElementById('podium');
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) { podium.innerHTML = ''; return; }

    podium.innerHTML = top3.map((e, i) => `
      <div class="podium-card rank-${i + 1}">
        <div class="podium-rank">${this.rankEmoji(i + 1)}</div>
        <div class="podium-name">${this.esc(e.name)}</div>
        <div class="podium-desc">${this.esc(e.description)}</div>
        <span class="podium-score">${e.score} 票</span>
      </div>
    `).join('');
  },

  renderList(entries, startRank) {
    const list = document.getElementById('leaderboardList');
    const user = Auth.getUser();

    const html = entries.map((e, i) => {
      const rank = startRank + i;
      return `
        <div class="entry-card" style="animation-delay:${i * 0.04}s">
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
          <div class="entry-votes">
            <button class="btn-vote ${e.user_vote === 1 ? 'active-up' : ''}" onclick="App.vote(${e.id}, 1)" title="赞">
              ▲
            </button>
            <span class="entry-score-display">${e.score}</span>
            <button class="btn-vote ${e.user_vote === -1 ? 'active-down' : ''}" onclick="App.vote(${e.id}, -1)" title="踩">
              ▼
            </button>
          </div>
          ${user && e.submitted_by === user.id ? `
            <button class="btn btn-outline btn-sm" onclick="App.deleteEntry(${e.id})" title="删除">🗑</button>
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
    const totalVotes = entries.reduce((s, e) => s + e.score, 0);
    document.getElementById('statVotes').textContent = totalVotes;
  },

  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
