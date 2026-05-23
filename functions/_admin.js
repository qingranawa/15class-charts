// functions/_admin.js — 管理员鉴权
import { error, getAuthUser } from './_utils.js';

export async function requireAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: error('请先登录', 401) };
  if (user.role !== 'admin') return { error: error('需要管理员权限', 403) };
  return { user };
}
