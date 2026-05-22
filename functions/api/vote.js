// POST /api/vote
import { json, error, readBody, getAuthUser } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const { entry_id, value } = await readBody(request);
  if (!entry_id || ![-1, 1].includes(value)) return error('参数无效');

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(entry_id).first();
  if (!entry) return error('条目不存在', 404);

  // 检查是否投过票
  const existing = await env.DB.prepare('SELECT id, value FROM votes WHERE entry_id = ? AND user_id = ?').bind(entry_id, user.userId).first();

  if (existing) {
    if (existing.value === value) {
      // 取消投票
      await env.DB.prepare('DELETE FROM votes WHERE id = ?').bind(existing.id).run();
    } else {
      // 更改投票
      await env.DB.prepare('UPDATE votes SET value = ? WHERE id = ?').bind(value, existing.id).run();
    }
  } else {
    await env.DB.prepare('INSERT INTO votes (entry_id, user_id, value) VALUES (?, ?, ?)').bind(entry_id, user.userId, value).run();
  }

  // 重新计算条目得分
  const score = await env.DB.prepare('SELECT COALESCE(SUM(value), 0) as total FROM votes WHERE entry_id = ?').bind(entry_id).first();
  await env.DB.prepare('UPDATE entries SET score = ? WHERE id = ?').bind(score.total, entry_id).run();

  return json({ score: score.total, vote: existing && existing.value === value ? null : value });
}
