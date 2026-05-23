// PATCH /api/admin/reports/:id — 处理投诉（resolved / dismissed）
import { json, error, readBody } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const report = await env.DB.prepare('SELECT id FROM reports WHERE id = ?').bind(params.id).first();
  if (!report) return error('投诉不存在', 404);

  const { status, resolution } = await readBody(request);
  if (!['resolved', 'dismissed'].includes(status)) return error('状态需为 resolved 或 dismissed');

  await env.DB.prepare('UPDATE reports SET status = ?, resolution = ?, resolved_by = ?, resolved_at = datetime(\'now\') WHERE id = ?').bind(status, resolution || '', auth.user.userId, params.id).run();

  return json({ success: true });
}
