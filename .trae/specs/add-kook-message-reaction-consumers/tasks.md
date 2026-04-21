# Tasks

- [x] Task 1: 数据库 Schema 更新与软删除逻辑
  - [x] SubTask 1.1: 在 `packages/db/src/schema/regear_apply.ts` 中为 `regear_applies` 增加 `deletedAt: text('deleted_at')` 字段。
  - [x] SubTask 1.2: 执行 `pnpm --filter db generate` 生成迁移文件。
  - [x] SubTask 1.3: 修改 `apps/api/src/modules/regear_apply/router.ts` 中的所有查询接口（如获取列表等），增加 `isNull(regearApplies.deletedAt)` 条件以排除已软删除的记录。

- [x] Task 2: 新增 API 接口
  - [x] SubTask 2.1: 在 `apps/api/src/modules/regear_apply/router.ts` 中新增 `DELETE /by-msg/:msgId` 路由（支持 `internalAuthMiddleware` 身份验证），根据 `msgId` 将 `deletedAt` 更新为当前时间。
  - [x] SubTask 2.2: 在 `apps/api/src/modules/regear_apply/router.ts` 中新增 `POST /by-msg/:msgId/reaction` 路由（支持 `internalAuthMiddleware` 身份验证），请求体接受 `{ action: 'add' | 'remove' }`。
  - [x] SubTask 2.3: 实现 `reaction` 接口的逻辑：根据 `msgId` 找到 `regearApplies` 及其关联的 `regears`；处理 `add` 逻辑（状态分别置为 `done` 和 `completed`）；处理 `remove` 逻辑（有 `regearId` 时均设为 `pending_regear`，无 `regearId` 时 `regearApplies.status` 设为 `binding`）。注意更新 `lastStatusTime`。

- [x] Task 3: KOOK Consumer Worker 实现
  - [x] SubTask 3.1: 在 `apps/kook-consumer-worker/wrangler.jsonc` 中增加 `ADMIN_USER_IDS` 环境变量配置（建议为逗号分隔的字符串），并在 `worker-configuration.d.ts` 中声明类型。
  - [x] SubTask 3.2: 创建 `apps/kook-consumer-worker/src/consumers/message_deleted.ts`：监听 `deleted_message` 事件，解析出被删除消息的 `msg_id` 并调用 `DELETE /regear_applies/by-msg/:msgId` API。
  - [x] SubTask 3.3: 创建 `apps/kook-consumer-worker/src/consumers/reaction_changed.ts`：监听 `added_reaction` 和 `deleted_reaction` 事件。检查 `emoji.name === '✅'` 或 `emoji.id === '✅'` 以及操作的 `user_id` 是否在 `ADMIN_USER_IDS` 中。
  - [x] SubTask 3.4: 若 `reaction_changed` 条件满足，调用 `POST /regear_applies/by-msg/:msgId/reaction` API（传入对应的 action `add` 或 `remove`）。
  - [x] SubTask 3.5: 在 `apps/kook-consumer-worker/src/consumer.ts` 的 `ConsumerRegistry` 中注册这两个新的 Consumer。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
