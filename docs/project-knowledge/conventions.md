---
last_updated: 2026-05-27
updated_by: superpowers-memory:update
triggered_by_plan: null
---

# Conventions

## Naming Patterns

**Files:** kebab-case（`deleted-entries.js`），JS 文件 camelCase（`_utils.js`）
**Functions/Methods:** camelCase（`getAuthUser`、`hashPassword`）
**Variables/Constants:** camelCase；模块级常量 `UPPER_SNAKE_CASE`（`TOKEN_EXPIRY`）
**Database:** 表名/列名 snake_case（`vote_balance`、`banned_until`）

## Code Style

**Formatter:** 无（无 .prettierrc / eslint 配置）
**Linter:** 无
**注释:** 中文，句尾可加喵～（`CLAUDE.local.md` 约定）

## Error Handling

**Strategy:** API 层返回 `{ error: "message" }` JSON + HTTP 状态码。`_utils.js` 提供 `error(msg, status)` 辅助函数。
**Custom errors:** 无自定义 Error 类，直接在 catch 中 toast 展示 `err.message`。
**前端:** `API.request()` 在 `!res.ok` 时 throw Error，各调用处 try/catch + `Components.showToast()`。

## Architecture Rules

- **前端零框架** — 不引入 React/Vue/Svelte，保持原生 HTML/CSS/JS
- **软删除原则** — entries 用 `deleted_at` 标记，不物理删除（除非管理员永久删除）
- **文件路由** — Cloudflare Functions 按 `functions/api/<path>.js` 自动映射到 `/api/<path>`
- **CORS 全局开放** — `_middleware.js` 允许所有来源（`Access-Control-Allow-Origin: *`）
- **登录/注册独立页面** — 不再使用模态弹窗，改用独立全屏页面（login.html / register.html），带渐变光晕背景

## Testing Conventions

**Framework:** 暂无测试框架
**Coverage target:** 无

## Git & Workflow

**Commit 格式:** Conventional Commits（`feat:` / `fix:` / `refactor:` / `docs:` / `ci:`）
**分支:** 直接在 main 上开发（小型个人项目）
**Host:** GitHub (`qingranawa/15class-charts`)
**CI/CD:** GitHub Actions 在 push main 时自动部署

## Cross-cutting concerns

**认证:** 所有需登录的 API 通过 `getAuthUser(request, env)` 提取 JWT payload，每次请求从 DB 刷新角色和封禁状态 → `functions/_utils.js`
**鉴权:** admin 操作通过 `requireAdmin()` / `requireStaff()` / `requireOwner()` 拦截 → `functions/_admin.js`
**CORS:** 全局中间件处理 OPTIONS 预检 + 所有响应注入 Allow-Origin 头 → `functions/_middleware.js`
**分页:** 前端 `Components.paginateData()` 统一分页逻辑（每页 20 行），写操作后 `clearCache()` 刷新。`goToPage()` 带竞态保护（`_rendering` 锁），防止快速连续点击导致渲染重叠 → `public/js/components.js`
**投票:** 放弃乐观更新，改用按钮 loading 态 + 全局锁（`_voteInProgress`）防止重复提交。等待 API 返回后，直接用响应数据更新 DOM（score/up_votes/down_votes/vote_balance）。本地维护 `_myVotes` 和 `_voteData` 缓存覆盖 D1 最终一致性导致的读取延迟。API 失败仅显示错误 Toast，无需回滚。 → `public/js/app.js` vote/voteFromDetail/updateEntryDOM

## Security Standards

- **密码存储:** PBKDF2（SHA-256, 100000 iterations, 16-byte salt），存储格式 `hex(salt):hex(hash)`
- **JWT:** HMAC-SHA256，7 天过期，secret 在 `wrangler.toml` 中配置
- **输入验证:** 服务端验证名称长度（50）、描述长度（2000）、vote value（±1）
- **XSS 防护:** `Components.esc()` 对用户输入做 HTML 转义渲染；marked.js 渲染规则说明（信任源）
