// DELETE /api/admin/entries/:id — 管理员强制删除条目
import { json, error } from '../../../_utils.js';
import { requireAdmin } from '../../../_admin.js';

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  await env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(params.id).run();
  return json({ success: true });
}
