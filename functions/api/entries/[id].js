// GET & DELETE /api/entries/:id
import { json, error, getAuthUser } from '../../_utils.js';

export async function onRequestGet({ request, env, params }) {
  const entry = await env.DB.prepare('SELECT e.*, u.username as submitter FROM entries e LEFT JOIN users u ON e.submitted_by = u.id WHERE e.id = ?').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  const votes = await env.DB.prepare('SELECT SUM(value) as total FROM votes WHERE entry_id = ?').bind(params.id).first();

  return json({ ...entry, vote_total: votes.total || 0 });
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const entry = await env.DB.prepare('SELECT submitted_by FROM entries WHERE id = ?').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);
  if (entry.submitted_by !== user.userId) return error('只能删除自己提交的条目', 403);

  await env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(params.id).run();
  return json({ success: true });
}
