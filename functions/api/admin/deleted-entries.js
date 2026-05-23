// GET /api/admin/deleted-entries — 获取 7 天内已删除的条目
import { json } from '../../_utils.js';
import { requireStaff } from '../../_admin.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const entries = await env.DB.prepare(`
    SELECT e.*, u.username as submitter
    FROM entries e
    LEFT JOIN users u ON e.submitted_by = u.id
    WHERE e.deleted_at IS NOT NULL
      AND e.deleted_at > datetime('now', '-7 days')
    ORDER BY e.deleted_at DESC
    LIMIT 100
  `).all();

  return json({ entries: entries.results });
}
