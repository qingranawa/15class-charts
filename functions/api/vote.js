// POST /api/vote — 投票，GET /api/vote — 查余额
import { json, error, readBody, getAuthUser } from '../_utils.js';

function daysBetween(d1, d2) {
  return Math.floor((new Date(d1) - new Date(d2)) / 86400000);
}

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const u = await env.DB.prepare('SELECT vote_balance, last_vote_refill FROM users WHERE id = ?').bind(user.userId).first();
  if (!u) return error('用户不存在', 404);

  // 检查是否需要补充每日票数
  let balance = u.vote_balance;
  let refill = u.last_vote_refill;
  if (balance < 1) {
    const days = daysBetween(new Date().toISOString(), refill);
    if (days >= 1) {
      balance = Math.min(days, 10); // 最多累积 10 票
      refill = new Date().toISOString();
      await env.DB.prepare('UPDATE users SET vote_balance = ?, last_vote_refill = ? WHERE id = ?').bind(balance, refill, user.userId).run();
    }
  }

  return json({ vote_balance: balance });
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error('请先登录', 401);

  const { entry_id, value } = await readBody(request);
  if (!entry_id || ![-1, 1].includes(value)) return error('参数无效');

  const entry = await env.DB.prepare('SELECT id FROM entries WHERE id = ?').bind(entry_id).first();
  if (!entry) return error('条目不存在', 404);

  // 获取用户票数信息
  const u = await env.DB.prepare('SELECT vote_balance, last_vote_refill FROM users WHERE id = ?').bind(user.userId).first();
  let balance = u.vote_balance;
  let refill = u.last_vote_refill;

  // 补充每日票数
  if (balance < 1) {
    const days = daysBetween(new Date().toISOString(), refill);
    if (days >= 1) {
      balance = Math.min(days, 10);
      refill = new Date().toISOString();
    }
  }

  // 检查是否有已有投票
  const existing = await env.DB.prepare('SELECT id, value FROM votes WHERE entry_id = ? AND user_id = ?').bind(entry_id, user.userId).first();

  if (existing) {
    if (existing.value === value) {
      // 取消投票，退款
      await env.DB.prepare('DELETE FROM votes WHERE id = ?').bind(existing.id).run();
      balance += 1;
      await env.DB.prepare('UPDATE users SET vote_balance = ?, last_vote_refill = ? WHERE id = ?').bind(balance, refill, user.userId).run();
    } else {
      // 改票，不消耗额外票数
      await env.DB.prepare('UPDATE votes SET value = ? WHERE id = ?').bind(value, existing.id).run();
      await env.DB.prepare('UPDATE users SET last_vote_refill = ? WHERE id = ?').bind(refill, user.userId).run();
    }
  } else {
    // 新投票，需要消耗票数
    if (balance < 1) return error('今日票数已用完，明天再来喵～', 429);
    balance -= 1;
    await env.DB.prepare('INSERT INTO votes (entry_id, user_id, value) VALUES (?, ?, ?)').bind(entry_id, user.userId, value).run();
    await env.DB.prepare('UPDATE users SET vote_balance = ?, last_vote_refill = ? WHERE id = ?').bind(balance, refill, user.userId).run();
  }

  // 重新计算条目得分
  const score = await env.DB.prepare('SELECT COALESCE(SUM(value), 0) as total FROM votes WHERE entry_id = ?').bind(entry_id).first();
  await env.DB.prepare('UPDATE entries SET score = ? WHERE id = ?').bind(score.total, entry_id).run();

  const newVote = existing && existing.value === value ? null : value;

  return json({ score: score.total, vote: newVote, vote_balance: balance });
}
