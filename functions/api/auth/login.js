// POST /api/auth/login
import { json, error, readBody, verifyPassword, signToken } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
  const { username, password } = await readBody(request);

  if (!username || !password) return error('用户名和密码不能为空');

  const user = await env.DB.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').bind(username).first();
  if (!user) return error('用户名或密码错误', 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return error('用户名或密码错误', 401);

  const token = await signToken({ userId: user.id, username: user.username, role: user.role }, env.JWT_SECRET);

  return json({ token, user: { id: user.id, username: user.username, role: user.role } });
}
