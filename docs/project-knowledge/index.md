---
last_updated: 2026-05-23
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
covers_branch: main@9327786
---

# Project Knowledge Index

- [architecture.md](architecture.md) — 系统边界、组件、数据流
  Key points: 单体 SPA + Serverless API；Cloudflare Pages + D1；零框架；JWT 认证；软删除 + 回收站

- [tech-stack.md](tech-stack.md) — 语言、框架、关键依赖
  Key points: 零框架 HTML/CSS/JS；仅 wrangler 一个 devDependency；marked.js CDN 外链

- [features.md](features.md) — 已实现功能、进行中、计划中
  Key points: 排行榜 + 提交 + 投票（10分封顶）+ 管理面板（5子面板）+ 投诉系统 + 软删除回收站

- [conventions.md](conventions.md) — 编码规范、架构规则、工作流
  Key points: 无 linter/formatter；Conventional Commits；中文注释；零框架原则；分页缓存 + 乐观更新

- [decisions.md](decisions.md) — ADR 日志、已知问题
  Key points: 无正式 ADR（项目规模小）；已知问题：无测试、JWT_SECRET 占位值

- [glossary.md](glossary.md) — 领域术语（统一语言）
  Key points: 11 个领域术语；涵盖投票/封禁/投诉/回收站/角色体系
