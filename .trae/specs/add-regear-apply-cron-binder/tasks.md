# Tasks

- [x] Task 1: 扩展 `regear_applies` 表字段（event_id / battle_id）
  - [x] SubTask 1.1: 在 `packages/db/src/schema/regear_apply.ts` 为 `regearApplies` 增加 `eventId`、`battleId` 字段映射到 `event_id`、`battle_id`（允许为空）
  - [x] SubTask 1.2: 新增 drizzle migration，为 `regear_applies` 表添加 `event_id`、`battle_id` 列
  - [x] SubTask 1.3: 确认迁移在 D1（SQLite）上可执行，并与当前 snapshot 兼容

- [x] Task 2: 更新 shared schema 与类型导出
  - [x] SubTask 2.1: 在 `packages/shared/src/schemas/regear_apply.ts` 的 `RegearApplySchema` 增加 `eventId?: string`、`battleId?: string`
  - [x] SubTask 2.2: 如有必要，补充列表响应 Schema（`ListRegearAppliesResponseSchema`）的验证覆盖新增字段

- [x] Task 3: API 输出与查询适配（apps/api）
  - [x] SubTask 3.1: 在 `apps/api/src/modules/regear_apply/router.ts` 的 list handler 输出映射中补齐 `eventId`、`battleId`
  - [x] SubTask 3.2: 视需要补充筛选逻辑（保持现有 query 参数不变；未绑定筛选由 cron job 内部处理）

- [x] Task 4: 新增 cron 模块与绑定逻辑（apps/api）
  - [x] SubTask 4.1: 新增 `apps/api/src/modules/cron/regear_apply_binder.ts`（或同层级命名），实现“拉取未绑定 apply -> 拉 battles -> 并发拉 events -> 匹配 -> 更新 apply”的核心逻辑
  - [x] SubTask 4.2: 并发策略：对 battle events 拉取设置并发上限（例如 5），并使用 `Promise.allSettled` 处理失败不影响整体
  - [x] SubTask 4.3: 匹配策略：按 victimName 精确匹配；按 timestamp（UTC）允许 5 分钟窗口；多条匹配时选择时间差最小的一条
  - [x] SubTask 4.4: DB 写回策略：匹配成功写入 `event_id/battle_id` 并将状态推进到 `pending_audit`；缺少关键字段则置为 `bind_failed`

- [x] Task 5: 接入 Cloudflare Scheduled handler + Cron triggers
  - [x] SubTask 5.1: 修改 `apps/api/src/index.ts` 导出形态为 `{ fetch, scheduled }`（保持现有 Hono app 的 fetch 行为不变）
  - [x] SubTask 5.2: 在 `apps/api/wrangler.jsonc` 新增 `triggers: { crons: ["*/1 * * * *"] }`
  - [x] SubTask 5.3: scheduled handler 调用 cron 模块，并确保异常不会导致 Worker 崩溃（允许本次 job 失败，下次重试）

- [x] Task 6: 验证
  - [x] SubTask 6.1: `pnpm --filter @albionbox/db run generate` 能生成迁移且类型正常
  - [x] SubTask 6.2: `pnpm --filter api run cf-typegen` 与 `pnpm --filter api run deploy --dry-run`（或仓库既有 TypeScript 检查命令）通过
  - [x] SubTask 6.3: 增加最小化单元测试或脚本（若仓库已有测试框架则复用），覆盖：timestamp 解析、匹配窗口、guild search 选择策略

# Task Dependencies
- [Task 3] depends on [Task 1] & [Task 2]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 1-5]
