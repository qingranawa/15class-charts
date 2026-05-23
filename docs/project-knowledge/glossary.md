---
last_updated: 2026-05-23
updated_by: superpowers-memory:rebuild
triggered_by_plan: null
---

# Glossary

**淡紫孩子** — 被吐槽的"操蛋人物"，即排行榜中的条目对象。→ `entries` 表
**条目 (Entry)** — 一个被提交的淡紫孩子记录，含名称、分类、事迹描述、分数。→ `schema.sql` entries 表
**票 (Vote)** — 用户对条目的赞(+1)或踩(-1)，每用户每条目仅一票。→ `schema.sql` votes 表
**赞 / 踩** — 投票方向：赞 = value 1（上票），踩 = value -1（下票）。→ `functions/api/vote.js`
**分数 (Score)** — 条目得分 = MAX(0, MIN(10, 赞数 - 踩数))，0-10 封顶。→ `entries.score`
**票数余额 (Vote Balance)** — 用户剩余可用票数，初始 10 票，每日 +1（上限 10）。→ `users.vote_balance`
**封禁 (Ban)** — 将用户 role 设为 `unauthorized` 并设置 `banned_until` 截止时间，期间不可投票和提交。→ `users.banned_until`
**投诉 (Report)** — 用户对不当条目提交的举报，管理员处理后状态变为 resolved/dismissed。→ `schema.sql` reports 表
**回收站 (Recycle Bin)** — 软删除条目列表（`deleted_at IS NOT NULL`），可恢复或永久删除。→ `functions/api/admin/deleted-entries.js`
**owner** — 最高权限角色，可管理 admin、访问管理人员面板。→ `functions/_admin.js` requireOwner
**staff** — admin 或 owner 的统称，均可访问管理面板。→ `functions/_admin.js` requireStaff
