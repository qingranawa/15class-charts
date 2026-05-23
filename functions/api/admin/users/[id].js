// PATCH & DELETE /api/admin/users/:id
import { json, error, readBody } from '../../../_utils.js';
import { requireStaff } from '../../../_admin.js';

function parseBanDuration(dur) {
  const map = {
    h: 3600000,
    d: 86400000,
    m: 2592000000,  // 30 天
    y: 31557600000, // 365.25 天
  };
  const match = dur.match(/^(\d+)([hdmy])$/);
  if (!match) return null;
  return parseInt(match[1]) * (map[match[2]] || 0);
}

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const targetId = parseInt(params.id);
  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return error('用户不存在', 404);

  // admin 不能修改 owner，owner 可以修改任何人喵～
  if (auth.user.role === 'admin' && target.role === 'owner') {
    return error('管理员无权修改所有者账号', 403);
  }

  const body = await readBody(request);

  // 自己不能改自己的角色/封禁状态，但可以给自己加票喵～
  if (auth.user.userId === targetId) {
    const hasDangerousOps = body.role !== undefined || body.ban_duration !== undefined;
    if (hasDangerousOps) return error('不能操作自己', 400);
  }

  // 定时封禁：ban_duration = "5h" / "1d" / "7d" / "1m" / "50y" 等
  if (body.ban_duration) {
    const ms = parseBanDuration(body.ban_duration);
    if (!ms) return error('无效的封禁时长格式，如 5h, 1d, 7d, 14d, 1m, 50y');

    const until = new Date(Date.now() + ms).toISOString().replace('T', ' ').slice(0, 19);
    await env.DB.prepare("UPDATE users SET role = 'unauthorized', banned_until = ? WHERE id = ?").bind(until, targetId).run();
    return json({ success: true, banned_until: until });
  }

  if (body.role !== undefined) {
    if (!['user', 'admin', 'unauthorized', 'owner'].includes(body.role)) return error('无效的角色');
    if (body.role === 'owner' && auth.user.role !== 'owner') return error('仅限所有者设置 owner 角色', 403);
    if (target.role === 'owner' && body.role !== 'owner' && auth.user.role !== 'owner') return error('无权修改所有者角色', 403);

    // 解封时清除 banned_until
    if (body.role === 'user' && target.role === 'unauthorized') {
      await env.DB.prepare("UPDATE users SET role = 'user', banned_until = NULL WHERE id = ?").bind(targetId).run();
    } else {
      await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(body.role, targetId).run();
    }
  }

  if (body.vote_balance !== undefined) {
    const n = parseInt(body.vote_balance);
    if (isNaN(n) || n < 0) return error('无效的票数');
    await env.DB.prepare('UPDATE users SET vote_balance = ? WHERE id = ?').bind(n, targetId).run();
  }

  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireStaff(request, env);
  if (auth.error) return auth.error;

  const targetId = parseInt(params.id);
  if (auth.user.userId === targetId) return error('不能删除自己', 400);

  const target = await env.DB.prepare('SELECT id, role FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return error('用户不存在', 404);

  if (auth.user.role === 'admin' && target.role === 'owner') return error('管理员无权删除所有者账号', 403);

  await env.DB.prepare('DELETE FROM votes WHERE user_id = ?').bind(targetId).run();
  await env.DB.prepare('DELETE FROM entries WHERE submitted_by = ?').bind(targetId).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  return json({ success: true });
}
