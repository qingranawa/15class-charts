---
last_updated: 2026-05-24
updated_by: superpowers-memory:update
triggered_by_plan: null
covers_branch: main@cc7e001
---

# Project Knowledge Index

- [architecture.md](architecture.md) — 系统边界、组件、数据流
  Key points: 单体 SPA + Serverless API；Cloudflare Pages + D1；零框架；JWT 实时角色刷新；软删除 + 回收站；GitHub Actions CI/CD

- [tech-stack.md](tech-stack.md) — 语言、框架、关键依赖
  Key points: 零框架 HTML/CSS/JS；仅 wrangler 一个 devDependency；marked.js CDN 外链；GitHub Actions 自动部署

- [features.md](features.md) — 已实现功能、进行中、计划中
  Key points: 排行榜 + 提交 + 每日限投（踩不消耗票）+ 管理面板（5子面板）+ 投诉系统 + 软删除回收站 + 账户管理 tab + 独立登录/注册页 + CI/CD

- [conventions.md](conventions.md) — 编码规范、架构规则、工作流
  Key points: 无 linter/formatter；Conventional Commits；中文注释；零框架原则；分页竞态保护 + 乐观更新回滚；登录/注册独立页面

- [decisions.md](decisions.md) — ADR 日志、已知问题
  Key points: 无正式 ADR（项目规模小）；已知问题：无测试、JWT_SECRET 占位值；设计记录：每日限投制 + 角色实时刷新

- [glossary.md](glossary.md) — 领域术语（统一语言）
  Key points: 12 个领域术语；涵盖投票/封禁/投诉/回收站/角色体系/账户 tab
