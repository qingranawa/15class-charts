# 15班排行榜 (15class-charts)

淡紫孩子榜 — 记录和展示"操蛋人物"排行榜的投票网站。用户可以提交人物、投票（赞/踩），前三名“光宗耀祖”

- GitHub: [https://github.com/qingranawa/15class-charts](https://github.com/qingranawa/15class-charts)

- Cloudflare: [https://15class-charts.pages.dev/](https://15class-charts.pages.dev/)

## 技术栈

| 层 | 技术 |
| --- | --- |
| 部署 | Cloudflare Pages + D1 (SQLite) |
| 后端 | Cloudflare Functions (workers-like, file-based routing) |
| 前端 | 原生 HTML/CSS/JS，零框架，暗色主题 |
| 认证 | 自签 JWT（HMAC-SHA256）+ PBKDF2 密码哈希（Web Crypto API） |
| 开发工具 | Wrangler CLI (`npx wrangler`) |

## 项目结构

```text
├── index.html              # 单页应用入口（SPA，三个 tab：排行榜/提交/管理）
├── wrangler.toml           # Cloudflare 配置（D1 binding、JWT_SECRET）
├── schema.sql              # D1 建表 SQL（users/entries/votes + 索引）
├── package.json            # 仅 wrangler 一个 devDependency
├── functions/              # Cloudflare Functions (后端 API)
│   ├── _middleware.js      # CORS 预处理 + 全局 Access-Control 头
│   ├── _utils.js           # 共享工具：JWT 签发/验证、PBKDF2 密码、json/error 响应
│   ├── _admin.js           # requireAdmin() 鉴权中间件
│   └── api/
│       ├── auth/           # POST /api/auth/login, /api/auth/register
│       ├── entries.js      # GET(列表)+POST(创建) /api/entries
│       ├── entries/[id].js # GET(详情)+DELETE(自删) /api/entries/:id
│       ├── vote.js         # GET(查余额)+POST(投票/改票/取消) /api/vote
│       └── admin/
│           ├── users.js         # GET /api/admin/users
│           ├── users/[id].js    # PATCH+DELETE /api/admin/users/:id
│           └── entries/[id].js  # DELETE /api/admin/entries/:id (强制删)
└── public/
    ├── css/style.css        # 完整样式（暗色主题、podium、模态框、admin面板）
    └── js/
        ├── api.js           # API 请求封装（fetch + JWT 注入）
        ├── auth.js          # 前端鉴权状态管理（localStorage token/user）
        ├── components.js    # UI 渲染（podium/列表/详情模态框/toast/管理表格）
        └── app.js           # 主应用逻辑（tab切换/排序/投票/提交/管理/弹窗）
```

## 数据库 Schema

三张表：`users`（role 分 user/admin，vote_balance 每天恢复 1 票最多 10 票）、`entries`（name/description/category/score/submitted_by）、`votes`（entry_id+user_id 唯一约束，value 为 1 或 -1，score 由 SUM(value) 计算）

索引：`entries(score DESC)`、`votes(entry_id)`、`votes(user_id, entry_id)`

## 关键规则

- **投票机制**：新用户初始 10 票，每天恢复 1 票（最多累积 10 票）。已投票的条目再次点同方向=取消投票（退款），点反方向=改票（不消耗额外票数）
- **删除权限**：普通用户只能删自己提交的条目；管理员通过 `/api/admin/entries/:id` 可强制删任意条目
- **管理员**：D1 中手动设 `role = 'admin'`（无注册入口），admin 可见管理面板 tab
- **认证流程**：JWT 存 localStorage，7 天过期，`_middleware.js` 处理 CORS（允许所有来源）

## 开发命令

```bash
npx wrangler dev              # 本地开发（模拟 Pages + D1）
npx wrangler d1 execute tj-kids-db --remote --file=./schema.sql  # 初始化远程 D1
npx wrangler d1 execute tj-kids-db --remote --command="SELECT '...'"  # 远程查询
npx wrangler pages deploy .   # 部署到 Cloudflare Pages
```

## JWT_SECRET

`wrangler.toml` 中 `vars.JWT_SECRET` 目前是占位值，生产环境需更换随机字符串喵～
