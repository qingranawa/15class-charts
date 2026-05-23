---
last_updated: 2026-05-23
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Decisions

## Known Issues

### Tech Debt

**无自动化测试** — 项目不含任何测试框架或测试用例。Fix: 考虑引入 Vitest（前端）+ 手动 API 测试脚本。

**JWT_SECRET 占位值** — `wrangler.toml` 中 JWT_SECRET 为 `"change-me-in-production-use-a-random-string"`，生产环境需更换。

**无 linter/formatter** — 项目无 Prettier/ESLint 配置。Fix: 按用户级 CLAUDE.md 首选项（前端 Prettier）添加配置。

### Security Considerations

**JWT 无刷新机制** — token 7 天过期后需重新登录。当前为小型项目可接受。
---
<!-- 本项目规模较小，无满足 ADR 三条件（跨模块 + ≥2 实质性替代方案 + 不可逆）的架构决策。
     技术选型（零框架、JWT、D1）均为小型项目的直接选择，落入 tech-stack.md 范围。 -->
