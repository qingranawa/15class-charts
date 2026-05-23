// POST /api/reports — 提交投诉
import { json, error, readBody, getAuthUser } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const { entry_id, reason } = await readBody(request);
  if (!entry_id || !reason || !reason.trim()) return error('参数无效');
  if (reason.length > 500) return error('投诉理由不能超过 500 字');

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(entry_id).first();
  if (!entry) return error('条目不存在', 404);

  await env.DB.prepare('INSERT INTO reports (entry_id, reporter_id, reason) VALUES (?, ?, ?)').bind(entry_id, user.userId, reason.trim()).run();

  return json({ success: true }, 201);
}
