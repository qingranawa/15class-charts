// PATCH & DELETE /api/admin/users/:id
import { json, error, readBody } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const targetId = parseInt(params.id);
  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return error('用户不存在', 404);

  // admin 不能修改 owner，owner 可以修改任何人
  if (auth.user.role === 'admin' && target.role === 'owner') {
    return error('管理员无权修改所有者账号', 403);
  }

  const body = await readBody(request);

  if (body.role !== undefined) {
    if (!['user', 'admin', 'unauthorized'].includes(body.role)) return error('无效的角色');
    // admin 不能把用户设为 owner
    if (body.role === 'owner' && auth.user.role !== 'owner') return error('仅限所有者设置 owner 角色', 403);
    // 只有 owner 可以把 admin 降级或把自己设为其他角色
    if (target.role === 'owner' && body.role !== 'owner' && auth.user.role !== 'owner') return error('无权修改所有者角色', 403);

    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(body.role, targetId).run();
  }

  if (body.vote_balance !== undefined) {
    const n = parseInt(body.vote_balance);
    if (isNaN(n) || n < 0) return error('无效的票数');
    await env.DB.prepare('UPDATE users SET vote_balance = ? WHERE id = ?').bind(n, targetId).run();
  }

  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const targetId = parseInt(params.id);
  if (auth.user.userId === targetId) return error('不能删除自己', 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return error('用户不存在', 404);

  // admin 不能删除 owner
  if (auth.user.role === 'admin' && target.role === 'owner') return error('管理员无权删除所有者账号', 403);

  await env.DB.prepare('DELETE FROM votes WHERE user_id = ?').bind(targetId).run();
  await env.DB.prepare('DELETE FROM entries WHERE submitted_by = ?').bind(targetId).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  return json({ success: true });
}
