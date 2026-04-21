# Add KOOK Message and Reaction Consumers Spec

## Why
需要支持在 KOOK 频道中直接对补损申请（regear applies）的消息进行操作：
1. 删除消息时，同步软删除对应的补损申请记录。
2. 特定管理员给消息添加 ✅ 回应时，自动将补损申请和关联的补损单（regear）状态置为完成。
3. 管理员移除 ✅ 回应时，回滚补损申请和补损单的状态。
这能极大地简化审核流程，使得管理员无需登录管理后台即可完成大部分操作。

## What Changes
- `regear_applies` 数据库表增加 `deleted_at` 字段，支持软删除。
- 修改现有针对 `regear_applies` 的查询接口，排除 `deleted_at IS NOT NULL` 的记录。
- 新增 API 接口用于处理消息删除：`DELETE /regear_applies/by-msg/:msgId`（使用内部身份验证，执行软删除）。
- 新增 API 接口用于处理回应变更：`POST /regear_applies/by-msg/:msgId/reaction`（使用内部身份验证，处理 ✅ 的添加和移除逻辑）。
- 在 `kook-consumer-worker` 中新增 `message_deleted` Consumer，监听删除消息事件并调用上述删除 API。
- 在 `kook-consumer-worker` 中新增 `reaction_changed` Consumer，监听添加/取消回应事件并调用上述回应变更 API。
- 在 Consumer 中通过环境变量 `ADMIN_USER_IDS` 配置允许触发这些操作的特定用户。

## Impact
- Affected specs: `kook-consumer-worker` 的事件处理逻辑，`apps/api` 的 `regear_applies` 模块。
- Affected code:
  - `packages/db/src/schema/regear_apply.ts`
  - `apps/api/src/modules/regear_apply/router.ts`
  - `apps/kook-consumer-worker/src/consumers/message_deleted.ts` (新建)
  - `apps/kook-consumer-worker/src/consumers/reaction_changed.ts` (新建)
  - `apps/kook-consumer-worker/src/consumer.ts`

## ADDED Requirements
### Requirement: 软删除补损申请
当 KOOK 中的消息被删除时，系统 SHALL 软删除对应的 `regear_applies` 记录。

#### Scenario: 成功软删除
- **WHEN** 收到 `deleted_message` 事件
- **THEN** 调用 API 根据 `msg_id` 查找记录并设置 `deleted_at` 为当前时间。

### Requirement: 回应变更修改状态
当特定用户对消息添加或移除 ✅ 回应时，系统 SHALL 更新对应的 `regear_applies` 和 `regears` 状态。

#### Scenario: 添加 ✅
- **WHEN** 收到 `added_reaction` 事件，且 `user_id` 在 `ADMIN_USER_IDS` 中，`emoji.id` 或 `emoji.name` 为 ✅
- **THEN** 调用 API，将 `regear_applies` 状态设为 `done`。如果有 `regear`，将 `regear` 状态设为 `completed`。

#### Scenario: 移除 ✅
- **WHEN** 收到 `deleted_reaction` 事件，且 `user_id` 在 `ADMIN_USER_IDS` 中，`emoji.id` 或 `emoji.name` 为 ✅
- **THEN** 调用 API，如果有关联的 `regear`，将两者状态均回滚为 `pending_regear`；如果没有关联的 `regear`，将 `regear_applies` 状态回滚为 `binding`。
