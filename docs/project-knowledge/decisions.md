---
last_updated: 2026-05-24
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
---
<!-- 本项目规模较小，无满足 ADR 三条件（跨模块 + ≥2 实质性替代方案 + 不可逆）的架构决策。
     技术选型（零框架、JWT、D1）均为小型项目的直接选择，落入 tech-stack.md 范围。 -->
