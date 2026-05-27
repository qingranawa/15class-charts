---
last_updated: 2026-05-27
updated_by: superpowers-memory:update
triggered_by_plan: null
---

# Architecture

## Pattern Overview

**Overall:** 单体 SPA + Serverless API，部署在 Cloudflare Pages + D1 上喵～

**Key Characteristics:**
- 前端零框架单页应用，四个 tab 切换（排行榜 / 提交 / 账户 / 管理），无客户端路由；登录/注册为独立全屏页面
- 后端 Cloudflare Functions 按文件路径路由，`_middleware.js` 统一 CORS
- 自签 JWT（HMAC-SHA256）存 localStorage，`_utils.js` 提供认证基元
- 软删除模式（`deleted_at` 字段），回收站可恢复

## System Context

**Actors:**
- 浏览器用户（未登录游客 / 已登录用户 / admin / owner）
- 管理员通过 D1 直接操作数据库（角色设定，无注册入口）

**External Systems:**
- Cloudflare Pages — 静态托管 + Functions 运行时
- Cloudflare D1 (SQLite) — 持久化存储
- Google Fonts + jsDelivr CDN — 字体和 marked.js 外链
- GitHub Actions — CI/CD 自动部署（push main → 部署到 Cloudflare Pages）

## Layering

**前端 (SPA)** — 纯静态 HTML/CSS/JS，负责 UI 渲染、Tab 切换、API 驱动更新。`/public/js/` + `/index.html`
- Key abstractions: `App`, `Auth`, `API`, `Components`

**后端 (Cloudflare Functions)** — 无状态 HTTP API，JWT 鉴权，文件路由对应 REST 端点。`/functions/`
- Key abstractions: `_utils.js`（JWT/PBKDF2/json 工具），`_middleware.js`（CORS），`_admin.js`（鉴权中间件）

**数据库 (D1/SQLite)** — 四张表：users / entries / votes / reports，score 由 votes 聚合计算。`/schema.sql`

**Call direction rules:**
- 前端 → 后端单向 HTTP 请求（`/api/*`），JWT Bearer 头传认证
- 后端 → D1 通过 `env.DB` binding，无跨服务调用
- 无事件总线、无消息队列、无微服务间通信

## Scenario Sequences

### 投票流程

```mermaid
sequenceDiagram
    participant B as 浏览器
    participant F as Cloudflare Function
    participant D as D1 (SQLite)

    B->>B: 按钮 loading 态 + 全局锁 _voteInProgress
    B->>F: POST /api/vote {entry_id, value: 1}
    F->>F: JWT 验证 + 封禁检查
    F->>D: 查询票数余额 + 补充每日票数
    F->>D: 查询是否已投过该条目
    alt 未投过
        alt 赞
            F->>D: 扣 1 票 + INSERT vote
        else 踩
            F->>D: 不扣票 + INSERT vote
        end
    else 今日已投
        F-->>B: 429 "今天已经投过了"
    else 旧日期投票覆盖
        alt 旧赞被覆盖
            F->>D: 退 1 票
        end
        F->>D: UPDATE vote value + created_at
        alt 新赞
            F->>D: 扣 1 票
        end
    end
    F->>D: SUM votes 重算 score（0-10 封顶）
    F-->>B: {score, up_votes, down_votes, vote, vote_balance}
    B->>B: 更新 _myVotes + _voteData 缓存
    B->>B: 用 API 响应数据直接更新 DOM + 刷新排行榜
    B->>B: 恢复按钮状态
    alt API 失败
        B->>B: 仅显示错误 Toast（无回滚）
    end
```

### 登录认证流程

```mermaid
sequenceDiagram
    participant B as 浏览器
    participant F as Cloudflare Function
    participant D as D1

    B->>F: POST /api/auth/login {username, password}
    F->>D: SELECT password_hash FROM users
    F->>F: PBKDF2 verifyPassword
    alt 验证成功
        F->>F: signToken (JWT, 7d expiry)
        F->>D: 检查 banned_until 自动解封
        F-->>B: {token, user: {id, username, role}}
        B->>B: localStorage 存 token + user
    else 验证失败
        F-->>B: 401
    end
```

## Key Object FSMs

### Entry 生命周期

```mermaid
stateDiagram-v2
    [*] --> active: POST /api/entries
    active --> active: 投票（score 波动 0-10）
    active --> deleted: DELETE (自删/管理员强删) / 写入 deleted_at
    deleted --> active: admin restore / 清除 deleted_at
    deleted --> [*]: admin permanent delete
```

### User 封禁状态

```mermaid
stateDiagram-v2
    [*] --> user: 注册
    user --> unauthorized: admin ban / 写入 banned_until
    unauthorized --> user: 到期自动解封 (getAuthUser 中检查) 或 admin unban
    unauthorized --> [*]: admin delete user
    user --> [*]: admin delete user
```

## Key Design Decisions

- **零框架 SPA** — 原生 HTML/CSS/JS，无 React/Vue，减少依赖和构建步骤。技术选型见 tech-stack.md
- **自签 JWT 认证** — HMAC-SHA256 + PBKDF2 密码哈希，无需第三方 OAuth。安全考量见 conventions.md §Security
- **软删除 + 回收站** — entries 用 `deleted_at` 标记而非物理删除，支持恢复。详见 features.md §回收站
- **10 分制封顶** — score = MAX(0, MIN(10, up_votes - down_votes))，避免极端分差
