// PATCH & DELETE /api/admin/entries/:id — 管理员编辑/删除条目
// 提交者也可以编辑自己的条目内容，但不能改分数喵～
import { json, error, readBody, getAuthUser } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

export async function onRequestPatch({ request, env, params }) {
  const staff = await requireStaff(request, env);
  const isStaff = !staff.error;

  const bodyUser = await getAuthUser(request, env);
  if (!isStaff && !bodyUser) return error('请先登录', 401);

  const entry = await env.DB.prepare('SELECT id, submitted_by FROM entries WHERE id = ? AND deleted_at IS NULL').bind(params.id).first();
  if (!entry) return error('条目不存在', 404);

  // 非管理员的提交者也只能编辑自己的条目
  if (!isStaff && entry.submitted_by !== bodyUser.userId) return error('只能编辑自己提交的条目', 403);

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
    if (!isStaff) return error('仅限管理员修改分数', 403);
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
