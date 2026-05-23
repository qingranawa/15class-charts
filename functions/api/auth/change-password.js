// POST /api/auth/change-password — 修改密码喵～
import { json, error, readBody, hashPassword, verifyPassword } from '../../_utils.js';
import { getAuthUser } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const { oldPassword, newPassword } = await readBody(request);

  if (!oldPassword || !newPassword) return error('旧密码和新密码不能为空');
  if (newPassword.length < 6) return error('新密码至少 6 个字符');

  const dbUser = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.userId).first();
  if (!dbUser) return error('用户不存在', 404);

  const valid = await verifyPassword(oldPassword, dbUser.password_hash);
  if (!valid) return error('旧密码错误', 403);

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.userId).run();

  return json({ success: true });
}
