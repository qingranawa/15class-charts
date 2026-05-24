import { json, error, getAuthUser } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return error("请先登录", 401);

  // 从 DB 获取最新角色喵～
  const row = await env.DB.prepare(
    "SELECT id, username, role, vote_balance FROM users WHERE id = ?"
  ).bind(user.userId).first();
  if (!row) return error("用户不存在", 404);

  return json({
    id: row.id,
    username: row.username,
    role: row.role,
    vote_balance: row.vote_balance,
  });
}
