// POST & DELETE /api/admin/deleted-entries/:id
// POST: 恢复条目, DELETE: 永久删除
import { json, error } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

export async function onRequestPost({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const entry = await env.DB.prepare('SELECT id, name FROM entries WHERE id = ? AND deleted_at IS NOT NULL').bind(params.id).first();
  if (!entry) return error('条目不存在或未被删除', 404);

  await env.DB.prepare('UPDATE entries SET deleted_at = NULL WHERE id = ?').bind(params.id).run();

  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ? AND deleted_at IS NOT NULL').bind(params.id).first();
  if (!entry) return error('条目不存在或未被删除', 404);

  // 永久删除：先删投票，再删条目
  await env.DB.prepare('DELETE FROM votes WHERE entry_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM reports WHERE entry_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(params.id).run();

  return json({ success: true });
}
