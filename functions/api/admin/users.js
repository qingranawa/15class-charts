// GET /api/admin/users — 管理员获取用户列表
import { json, error } from '../../_utils.js';
import { requireAdmin } from '../../_admin.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const users = await env.DB.prepare('SELECT id, username, role, vote_balance, created_at FROM users ORDER BY id').all();
  return json({ users: users.results });
}
