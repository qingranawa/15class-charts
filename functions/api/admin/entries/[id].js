// PATCH & DELETE /api/admin/entries/:id — 管理员编辑/删除条目
import { json, error, readBody } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  const body = await readBody(request);
  const updates = [];
  const values = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 50) return error('名称需 1-50 个字符喵～');
    updates.push('name = ?');
    values.push(name);
  }
  if (body.description !== undefined) {
    const desc = String(body.description).trim();
    if (!desc || desc.length > 2000) return error('描述需 1-2000 个字符喵～');
    updates.push('description = ?');
    values.push(desc);
  }
  if (body.category !== undefined) {
    const cats = ['classmate', 'colleague', 'stranger', 'family', 'other'];
    if (!cats.includes(body.category)) return error('无效的分类喵～');
    updates.push('category = ?');
    values.push(body.category);
  }
  if (body.score !== undefined) {
    const score = parseInt(body.score);
    if (isNaN(score)) return error('无效的分数喵～');
    updates.push('score = ?');
    values.push(score);
  }

  if (updates.length === 0) return error('没有要更新的字段喵～');

  values.push(params.id);
  await env.DB.prepare(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  // 如果修改了 score，同步修正 votes 表（管理员调整票数时删除旧的自动计票，写入调整值）
  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ? AND deleted_at IS NULL').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  await env.DB.prepare("UPDATE entries SET deleted_at = datetime('now') WHERE id = ?").bind(params.id).run();
  return json({ success: true });
}
