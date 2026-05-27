---
last_updated: 2026-05-27
updated_by: superpowers-memory:update
triggered_by_plan: null
---

# Decisions

## Known Issues

### Tech Debt

**无自动化测试** — 项目不含任何测试框架或测试用例。Fix: 考虑引入 Vitest（前端）+ 手动 API 测试脚本。

**JWT_SECRET 占位值** — `wrangler.toml` 中 JWT_SECRET 为 `"change-me-in-production-use-a-random-string"`，生产环境需更换。

**无 linter/formatter** — 项目无 Prettier/ESLint 配置。Fix: 按用户级 CLAUDE.md 首选项（前端 Prettier）添加配置。

### Design Notes

**每日限投制** — 投票改为每人每天每人物限投一次（以 `created_at` 日期判断），踩票不消耗票数。旧日期投票可被新投票覆盖（旧赞退票，旧踩不退）。此设计防止刷票，同时保持每天表达意见的自由度。

**角色实时刷新** — `getAuthUser()` 每次请求从 DB 读取最新 role，角色变更无需重新登录。这是对原始"JWT 内嵌角色"方案的改进，解决了管理员封禁/降级用户的即时生效需求。

**D1 最终一致性应对** — Cloudflare D1 在写入后存在读取延迟（GET 返回旧数据）。前端通过本地缓存 `_myVotes`（投票方向）+ `_voteData`（得分数据）在投票后覆盖 API 响应，确保用户看到的是刚刚投票的结果而非陈旧的 D1 数据。同时将 entries 列表和详情的 `user_vote` 查询从"仅当日"改为"所有投票"，让按钮正确显示历史投票状态。

**批量操作并发优化** — 管理员批量封禁/解封/删除操作用户从串行 `for` 循环改为 `Promise.all()` 并发执行，减少等待时间。同时增加操作前 `clearCache()` + loading Toast，确保 UI 及时反馈。

**前端角色实时获取** — 新增 `GET /api/auth/me` 端点，页面初始化时调用获取最新角色信息，解决 D1 写入后读取延迟导致的管理面板不可见问题。
---
<!-- 本项目规模较小，无满足 ADR 三条件（跨模块 + ≥2 实质性替代方案 + 不可逆）的架构决策。
     技术选型（零框架、JWT、D1）均为小型项目的直接选择，落入 tech-stack.md 范围。 -->
