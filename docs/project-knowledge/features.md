---
last_updated: 2026-05-27
updated_by: superpowers-memory:update
triggered_by_plan: null
---

# Features

## Implemented

### Product Capabilities

#### 排行榜（Leaderboard）

**Enables** — 用户浏览所有上榜条目，按分数 / 最新 / 最早排序，前三名登上领奖台展示。

**Actors / Entry Points** — 所有访问者（无需登录）；`GET /api/entries`，前端 `App.loadLeaderboard()`

**Capability Boundary** — 分页加载每页 20 条，"加载更多"按钮追加。搜索防抖 300ms。分数以进度条（0-10）展示。前三名 podium 卡片 + 第四名起列表渲染。

**References** — architecture.md §场景序列-投票流程；`/public/js/app.js` loadLeaderboard/loadMore

#### 条目提交

**Enables** — 登录用户提交新人物条目（名称、分类、事迹描述），提交后自动跳转排行榜。

**Actors / Entry Points** — 已登录用户；`POST /api/entries`；前端 tab "提交新人物"

**Capability Boundary** — 名称限 50 字符，描述限 2000 字符。分类可选同学/同事/路人/家人/其他。提交表单旁有可折叠的"上传内容规则"（Markdown 渲染）。未登录用户看到登录提示。

**References** — `functions/api/entries.js` onRequestPost；`/public/js/app.js` handleSubmit

#### 投票（赞/踩）

**Enables** — 用户对条目投赞成或反对票，每人每天每人物限投一次，踩票不消耗票数。分值 0-10 封顶。

**Actors / Entry Points** — 已登录用户；`POST /api/vote`；排行榜卡片和详情弹窗中的赞/踩按钮

**Capability Boundary** — 新用户初始 10 票，每天恢复 1 票（最多累积 10 票）。赞消耗 1 票，踩不消耗。每人每天每条目仅可投一次（以 `created_at` 日期判断）。次日可覆盖旧日期的投票（旧赞退票，旧踩不退）。票数用完时提示"明天再来"。前端不再使用乐观更新，改用按钮 loading 态 + 全局锁（`_voteInProgress`），等待 API 返回后直接用响应数据更新 DOM。本地缓存 `_myVotes`（投票方向）+ `_voteData`（得分数据）覆盖 D1 最终一致性导致的读取延迟。投票后自动刷新排行榜。podium 卡片也支持直接投票。

**References** — architecture.md §场景序列-投票流程；`functions/api/vote.js`

#### 条目详情弹窗

**Enables** — 点击任意条目或 podium 卡片打开详情模态框，展示完整描述、赞踩明细、投票按钮、投诉按钮。

**Actors / Entry Points** — 所有访问者；`GET /api/entries/:id`；前端 `App.showDetail()`

**Capability Boundary** — 详情模态框内可直接投票（需登录），投票后即时刷新详情内容。管理员可见"管理提交者"按钮展开封禁选项。

**References** — `public/js/app.js` showDetail/voteFromDetail；`public/js/components.js` renderDetail

#### 条目编辑（提交者 & 管理员）

**Enables** — 提交者可编辑自己条目的名称/分类/描述；管理员/owner 还可修改分数。

**Actors / Entry Points** — 已登录用户（自己提交的条目）或 staff（任意条目）；`PATCH /api/admin/entries/:id`

**Capability Boundary** — 非管理员用户编辑时不显示分数修改字段。编辑后清除管理面板缓存。

**References** — `public/js/app.js` showEditEntry/handleEditEntry

### User / Operator Workflows

#### 登录 / 注册

**Enables** — 用户通过独立页面注册账号（用户名 2-20 字符，密码 ≥6 字符）并登录获取 JWT token（7 天有效期）。

**Actors / Entry Points** — 访问者；`POST /api/auth/login`、`POST /api/auth/register`；/login.html 和 /register.html 独立页面

**Capability Boundary** — 登录/注册为独立全屏页面（暗色背景 + 渐变光晕），非弹窗。登录后导航栏显示票数余额、用户名、账户按钮、退出按钮。JWT 过期自动登出。btoa/atob 支持中文用户名（UTF-8 字节中转）。

**References** — architecture.md §场景序列-登录认证；`functions/_utils.js`；`public/js/auth.js`；`login.html`；`register.html`

#### 账户管理

**Enables** — 登录用户查看账户信息（用户名/角色/票数/注册时间）、修改密码、管理自己上传的条目。

**Actors / Entry Points** — 已登录用户；tab "账户"（👤 账户）；`POST /api/auth/change-password`

**Capability Boundary** — 2 列网格布局（移动端单列）：账户信息卡片 + 改密表单卡片 + 我上传的人物全宽卡片。角色以彩色标签展示（owner 金色 / admin 金色 / user 灰色）。注册时间从 JWT iat 解码。改密需验证旧密码 + 新密码确认。我上传的条目支持 Shift 区间复选 + 批量删除 + 单条编辑/删除。

**References** — `public/js/app.js` renderAccountTab/handleAccountChangePassword；`functions/api/auth/change-password.js`；`index.html` tabAccount

#### 投诉 / 举报

**Enables** — 任何登录用户对不当条目提交投诉（附理由）；管理员在投诉管理面板处理（修改/下架/驳回）。

**Actors / Entry Points** — 已登录用户点击"投诉"按钮；管理员在 admin tab 处理。`POST /api/reports`，`GET /api/admin/reports`，`PATCH /api/admin/reports/:id`

**Capability Boundary** — 投诉按钮对所有人可见，未登录点击跳转登录页。管理员处理时会同时标记投诉状态 + 操作该条目。投诉管理面板支持管理提交者（封禁）。

**References** — `functions/api/reports.js`；`functions/api/admin/reports.js`

### Platform Capabilities

#### JWT 认证 + 实时角色刷新

**Enables** — 自签 JWT（HMAC-SHA256）提供无状态认证，`getAuthUser()` 每次请求从 DB 刷新角色和封禁状态，角色变更无需重新登录。

**Actors / Entry Points** — 所有需认证的 API 端点（通过 `Authorization: Bearer <token>` 头）

**Capability Boundary** — JWT payload 含 userId/username/role/exp。getAuthUser 每次请求查询 DB 刷新 role + banned_until，封禁到期自动恢复。token 7 天过期。CORS 在 `_middleware.js` 中允许所有来源。

**References** — `functions/_utils.js` signToken/verifyToken/getAuthUser；`functions/_admin.js`；`functions/_middleware.js`

#### 角色体系

**Enables** — 四级角色：unauthorized（封禁）/ user / admin / owner。owner 为最高权限，可管理 staff。

**Actors / Entry Points** — D1 手动设定 role；`_admin.js` 中间件在 API 层校验

**Capability Boundary** — owner 可见"管理人员"tab，admin 不可见。owner 可升降 admin/owner、可删除 admin。admin 可给自己加票但不能改自己的角色/封禁。owner 不可被他人操作。

**References** — `functions/_admin.js` requireAdmin/requireStaff/requireOwner；`functions/api/admin/users/[id].js`

### Operations

#### 管理面板（Admin Dashboard）

**Enables** — 管理员集中管理用户（角色/票数/封禁/删除）、条目（编辑/删除）、投诉（处理/驳回）、回收站（恢复/永久删除）。支持批量操作。

**Actors / Entry Points** — admin/owner；前端 tab "管理"；多个 `/api/admin/*` 端点

**Capability Boundary** — 5 个子面板（用户管理/条目管理/投诉管理/管理人员/删除的内容）。分页 20 行，有搜索过滤（用户管理），Shift 区间复选，批量封禁/解封/删除。分页渲染竞态保护（`_rendering` 锁防重复渲染）。owner-only 功能自动隐藏。

**References** — `public/js/app.js` (admin 相关方法)；`public/js/components.js` renderAdminUsers/Entries/Reports/Staff/DeletedEntries/goToPage

#### 软删除 + 回收站

**Enables** — 条目删除时写入 `deleted_at` 而非物理删除，管理员可在回收站恢复或永久删除。

**Actors / Entry Points** — admin/owner；`GET /api/admin/deleted-entries`、`POST /api/admin/deleted-entries/:id`（恢复）、`DELETE /api/admin/deleted-entries/:id`（永久删除）

**Capability Boundary** — 软删除的条目在排行榜中不可见（`WHERE deleted_at IS NULL`）。回收站为空时显示"回收站为空喵～"。

**References** — `functions/api/admin/deleted-entries.js`；`schema.sql` entries.deleted_at 字段

#### CI/CD 自动部署

**Enables** — GitHub Actions 在 push main 时自动部署到 Cloudflare Pages，无需手动执行 `wrangler pages deploy`。

**Actors / Entry Points** — GitHub push → `.github/workflows/deploy.yml`

**Capability Boundary** — 仅 main 分支触发。自动检测 `.github/workflows/deploy.yml` 中的 Cloudflare API token secret。

**References** — `.github/workflows/deploy.yml`
