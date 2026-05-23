// GET /api/admin/reports — 管理员获取投诉列表
import { json } from '../../_utils.js';
import { requireStaff } from '../../_admin.js';

export async function onRequestGet({ request, env }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const reports = await env.DB.prepare(`
    SELECT r.*, e.name as entry_name, e.submitted_by,
           u.username as reporter_name,
           su.username as submitter_name,
           ru.username as resolver_name
    FROM reports r
    LEFT JOIN entries e ON r.entry_id = e.id
    LEFT JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users su ON e.submitted_by = su.id
    LEFT JOIN users ru ON r.resolved_by = ru.id
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all();

  return json({ reports: reports.results });
}
