// POST /api/auth/register
import { json, error, readBody, hashPassword } from '../../_utils.js';

export async function onRequestPost({ request, env }) {
  const { username, password } = await readBody(request);

  if (!username || !password) return error('用户名和密码不能为空');
  if (username.length < 2 || username.length > 20) return error('用户名需 2-20 个字符');
  if (password.length < 6) return error('密码至少 6 个字符');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return error('用户名已被注册', 409);

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').bind(username, passwordHash).run();

  return json({ id: result.meta.last_row_id, username }, 201);
}
