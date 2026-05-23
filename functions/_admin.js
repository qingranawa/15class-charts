// functions/_admin.js — 管理员鉴权（admin + owner）
import { error, getAuthUser } from './_utils.js';

// requireStaff: admin 或 owner 均可访问管理面板
export async function requireStaff(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: error('请先登录', 401) };
  if (user.role !== 'admin' && user.role !== 'owner') return { error: error('需要管理员权限', 403) };
  return { user };
}

// requireAdmin: 向后兼容，等同于 requireStaff
export async function requireAdmin(request, env) {
  return requireStaff(request, env);
}

// requireOwner: 仅 owner 可执行的操作
export async function requireOwner(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: error('请先登录', 401) };
  if (user.role !== 'owner') return { error: error('仅限所有者操作', 403) };
  return { user };
}
