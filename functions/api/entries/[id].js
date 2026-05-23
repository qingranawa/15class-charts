// GET & DELETE /api/entries/:id
import { json, error, getAuthUser } from '../../_utils.js';

export async function onRequestGet({ request, env, params }) {
  const entry = await env.DB.prepare('SELECT e.*, u.username as submitter FROM entries e LEFT JOIN users u ON e.submitted_by = u.id WHERE e.id = ? AND e.deleted_at IS NULL').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  const stats = await env.DB.prepare('SELECT COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) as up_votes, COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) as down_votes FROM votes WHERE entry_id = ?').bind(params.id).first();

  // 当前用户的投票状态
  const user = await getAuthUser(request, env);
  let user_vote = 0;
  if (user) {
    const vote = await env.DB.prepare('SELECT value FROM votes WHERE entry_id = ? AND user_id = ?').bind(params.id, user.userId).first();
    if (vote) user_vote = vote.value;
  }

  return json({ ...entry, up_votes: stats.up_votes, down_votes: stats.down_votes, user_vote });
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const entry = await env.DB.prepare('SELECT submitted_by FROM entries WHERE id = ? AND deleted_at IS NULL').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);
  if (entry.submitted_by !== user.userId) return error('只能删除自己提交的条目', 403);

  await env.DB.prepare("UPDATE entries SET deleted_at = datetime('now') WHERE id = ?").bind(params.id).run();
  return json({ success: true });
}
