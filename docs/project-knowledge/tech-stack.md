---
last_updated: 2026-05-24
updated_by: superpowers-memory:update
triggered_by_plan: null
---

# Tech Stack

## Languages & Frameworks

| Technology | Role | Version | Notes |
|-----------|------|---------|-------|
| HTML/CSS/JS | 前端 | - | 零框架，暗色主题 |
| JavaScript (ES Modules) | 后端 | - | Cloudflare Functions 运行时 |
| SQLite (D1) | 数据库 | - | Cloudflare D1 binding |

## Runtime

**Environment:** Cloudflare Pages Functions（兼容 Workers runtime）
**Package Manager:** npm (package-lock.json)
**Lockfile:** package-lock.json

## Key Dependencies

| Package | Purpose | Why Chosen |
|---------|---------|------------|
| wrangler | 本地开发 + 部署 CLI | Cloudflare 官方工具链，唯一 devDependency |
| marked.js | Markdown 渲染（内容规则） | CDN 外链，轻量无依赖 |
| Google Fonts (Noto Sans SC) | 中文字体 | CDN 外链 |

## Build & Dev Tools

| Tool | Purpose |
|------|---------|
| `npx wrangler dev` | 本地开发服务器（模拟 Pages + D1） |
| `npx wrangler d1 execute` | D1 远程查询/迁移 |
| `npx wrangler pages deploy .` | 部署到 Cloudflare Pages |

## CI/CD

**Platform:** GitHub Actions
**Trigger:** push to main
**Workflow:** `.github/workflows/deploy.yml` — 自动执行 `wrangler pages deploy`，无需手动部署
**Secrets:** Cloudflare API token 存储在 GitHub Secrets

## Configuration

**Environment:** `wrangler.toml` 中的 `vars.JWT_SECRET`（生产环境需更换）
**Build:** 无需构建步骤，直接部署源文件

## Platform Requirements

**Development:** Node.js + npm（仅需 wrangler）
**Production:** Cloudflare Pages + D1

## Infrastructure

- **Hosting:** Cloudflare Pages（静态资源 + Functions）
- **Database:** Cloudflare D1（SQLite，binding 名 `DB`，数据库 `tj-kids-db`）
- **CDN:** jsDelivr（marked.js）、Google Fonts
- **CI/CD:** GitHub Actions
