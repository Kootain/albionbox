# Tasks

- [x] Task 1: 更新前端入口和路由传参以支持 needApply
  - [x] 在 `RegearApprovalTab.tsx` 中，更新 `onRegearPreview` 回调调用：`onRegearPreview(battleIds, true)`。
  - [x] 在 `GuildDashboardPage.tsx` 中，更新 `handleRegearPreview` 签名：`(ids: string[], needApply?: boolean)`。将 `needApply` 传入 `location.state`。

- [x] Task 2: 新增 API 接口通过 battleIds 拉取 records 和 applies
  - [x] 在 `apps/api/src/modules/regear/router.ts` 新增 `POST /:guildId/regear/records/by-battles`：查询 `regearTicketBattles` 关联的且在 `battleIds` 列表内的 `regears` 记录，注意要加上 `regearTickets` 不被删除且属于当前 `guildId` 的限制条件。
  - [x] 在 `apps/api/src/modules/regear_apply/router.ts` 新增 `POST /by-battles`：查询 `regearApplies` 表，`battleId` 在传入列表内，且不带 `regearId` (未处理)的记录。

- [x] Task 3: 改造 `fetchPreviewData` 并应用新状态推导逻辑
  - [x] 在 `RegearTab.tsx` 中提取 `location.state` 的 `needApply`。
  - [x] 在 `fetchPreviewData` 时，使用 `Promise.all` 并发调用这两个新 `POST` 接口，同时获取 `regears` 和 `applies`。
  - [x] 在组装 `RegearRecord` 时计算 `status`：
    - `const isApplied = applies.some(a => a.eventId === String(ev.EventId));`
    - `const existingRegear = regears.find(r => r.eventId === String(ev.EventId));`
    - `status = existingRegear ? existingRegear.status : (needApply ? (isApplied ? 'pending_review' : 'excluded') : 'pending_review')`
  - [x] 更新 `RegearOrderDetail` 时，将 `needApply` 也保存到 state 中（或者在创建工单时从 `location.state` 直接读取）。

- [x] Task 4: 创建工单时带上 needApply
  - [x] 在 `RegearTab.tsx` 的 `handleCreateOrderFromPreview` 函数中，发起 `api.guilds[':guildId'].regear.tickets.$post` 请求时，在 `json` payload 中追加 `needApply`。

# Task Dependencies
- Task 3 depends on Task 2
- Task 4 depends on Task 3