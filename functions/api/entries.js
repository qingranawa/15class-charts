// GET & POST /api/entries
import { json, error, readBody, getAuthUser } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;
  const sort = url.searchParams.get('sort') || 'score';
  const search = url.searchParams.get('search') || '';

  const allowSort = { score: 'score DESC', newest: 'created_at DESC', oldest: 'created_at ASC' };
  const orderBy = allowSort[sort] || 'score DESC';

  const user = await getAuthUser(request, env);

  let whereClause = 'WHERE e.deleted_at IS NULL';
  const whereParams = [];
  if (search) {
    whereClause += ' AND (e.name LIKE ? OR e.description LIKE ?)';
    whereParams.push(`%${search}%`, `%${search}%`);
  }

  const [entries, total] = await Promise.all([
    env.DB.prepare(`SELECT e.*, u.username as submitter FROM entries e LEFT JOIN users u ON e.submitted_by = u.id ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...whereParams, limit, offset).all(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM entries e ${whereClause}`).bind(...whereParams).first(),
  ]);

  // 为每个条目附加赞/踩数和用户投票状态
  if (entries.results.length > 0) {
    const ids = entries.results.map(e => e.id);
    const placeholders = ids.map(() => '?').join(',');
    // 批量查询赞踩统计
    const stats = await env.DB.prepare(`SELECT entry_id, COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) as up_votes, COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) as down_votes FROM votes WHERE entry_id IN (${placeholders}) GROUP BY entry_id`).bind(...ids).all();
    const statsMap = {};
    for (const s of stats.results) statsMap[s.entry_id] = { up_votes: s.up_votes, down_votes: s.down_votes };
    for (const e of entries.results) {
      const s = statsMap[e.id] || { up_votes: 0, down_votes: 0 };
      e.up_votes = s.up_votes;
      e.down_votes = s.down_votes;
    }
    // 用户投票状态（查所有投票，让按钮显示正确的活跃状态喵～）
    if (user) {
      const votes = await env.DB.prepare(`SELECT entry_id, value FROM votes WHERE user_id = ? AND entry_id IN (${placeholders})`).bind(user.userId, ...ids).all();
      const voteMap = {};
      for (const v of votes.results) voteMap[v.entry_id] = v.value;
      for (const e of entries.results) e.user_vote = voteMap[e.id] || 0;
    }
  }

  return json({ entries: entries.results, total: total.count, page, limit });
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);
  if (user.role === 'unauthorized') return error('账号已被限制，无法提交内容', 403);

  const { name, description, category } = await readBody(request);
  if (!name || !description) return error('名称和描述不能为空');
  if (name.length > 50) return error('名称不能超过 50 个字符');
  if (description.length > 2000) return error('描述不能超过 2000 个字符');

  const result = await env.DB.prepare('INSERT INTO entries (name, description, category, submitted_by) VALUES (?, ?, ?, ?)').bind(name.trim(), description.trim(), category || 'other', user.userId).run();

  return json({ id: result.meta.last_row_id, name, description, category }, 201);
}
