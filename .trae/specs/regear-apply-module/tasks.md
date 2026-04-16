# Tasks

- [x] Task 1: 在 `@albionbox/db` 中创建 `regear_applies` 表
  - [x] SubTask 1.1: 创建 `packages/db/src/schema/regear_apply.ts` 文件，使用 `drizzle-orm/sqlite-core` 定义表字段。
  - [x] SubTask 1.2: 字段包括：`id` (主键 UUID)、`msg_id`、`msg_username`、`msg_userid`、`msg_guild`、`msg_channel`、`create_time`、`last_status_time`、`regear_id`、`apply_meta`、`status`、`victim_name`、`victim_guild`、`apply_detail`。
  - [x] SubTask 1.3: 在 `packages/db/src/schema/index.ts` 中导出 `regear_apply.ts`。
- [x] Task 2: 在 `@albionbox/shared` 中定义 Schema
  - [x] SubTask 2.1: 创建 `packages/shared/src/schemas/regear_apply.ts`，定义 `ApplyStatus` enum 和 `RegearApplySchema`。
  - [x] SubTask 2.2: 定义相关接口请求体的 Schema：`CreateRegearApplySchema`、`UpdateApplyStatusSchema`、`BindRegearApplySchema`、`UpdateApplyDetailSchema`。
  - [x] SubTask 2.3: 在 `packages/shared/src/index.ts` 中导出。
- [x] Task 3: 在 `apps/api` 中实现 `regear_apply` API 模块
  - [x] SubTask 3.1: 创建 `apps/api/src/modules/regear_apply/router.ts`，基于 Hono 创建路由和 Handler。
  - [x] SubTask 3.2: 实现 `POST /` 接口创建申请，`DELETE /:id` 接口删除申请。
  - [x] SubTask 3.3: 实现 `PUT /:id/status` 接口更新状态，并更新 `last_status_time`。
  - [x] SubTask 3.4: 实现 `PUT /:id/bind` 接口绑定 `regear_id`，并更新 `last_status_time`。
  - [x] SubTask 3.5: 实现 `PUT /:id/detail` 接口更新 `apply_detail`。
  - [x] SubTask 3.6: 将模块注册到全局路由中（如 `apps/api/src/index.ts` 或根据当前架构的路由规范挂载）。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]