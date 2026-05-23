// PATCH & DELETE /api/admin/users/:id
import { json, error, readBody } from '../../../_utils.js';
import { requireAdmin } from '../../../_admin.js';

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const body = await readBody(request);
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(params.id).first();
  if (!user) return error('用户不存在', 404);

  const updates = [];
  const values = [];

  if (body.role !== undefined) {
    if (!['user', 'admin'].includes(body.role)) return error('无效的角色');
    updates.push('role = ?');
    values.push(body.role);
  }
  if (body.vote_balance !== undefined) {
    const n = parseInt(body.vote_balance);
    if (isNaN(n) || n < 0) return error('无效的票数');
    updates.push('vote_balance = ?');
    values.push(n);
  }

  if (updates.length === 0) return error('没有要更新的字段');

  values.push(params.id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  if (auth.user.userId === parseInt(params.id)) return error('不能删除自己', 400);

  await env.DB.prepare('DELETE FROM votes WHERE user_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM entries WHERE submitted_by = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(params.id).run();

  return json({ success: true });
}
