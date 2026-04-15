# Regear Apply Bind 成功后 KOOK Reaction Spec

## Why
当 `regear_apply` 被 cron 自动匹配并绑定成功后，需要在原 KOOK 消息上打一个 reaction，给业务方一个“已处理/已绑定”的可视化反馈，减少重复人工确认成本。

## What Changes
- 在 `apps/api` 的 regear_apply 自动绑定 cron 流程中：绑定成功（写入 `event_id/battle_id` 并推进到 `pending_audit`）后，使用 KOOK SDK 对原消息添加 reaction（emoji：`🔗`）。
- 在 `apps/api` 增加一个最小 KOOK SDK 调用封装（复用现有 `KOOK_BOT_TOKEN`），并在 cron 流程中调用；reaction 失败不影响绑定结果（允许下次 cron 继续处理其他 apply）。

## Impact
- Affected specs: 补装申请自动绑定后的通知反馈
- Affected code:
  - `apps/api/src/modules/cron_regear_apply_binder.ts`
  - `apps/api/package.json`（引入 KOOK SDK 依赖，若 `apps/api` 尚未包含）
  - `apps/api/src/lib/kook-sdk/*`（新增封装，若需要）
  - `apps/api/scripts/regear-apply-binder-smoke.ts`（扩展最小验证）

## ADDED Requirements
### Requirement: 绑定成功后添加 KOOK Reaction
系统 SHALL 在 cron 绑定成功后，向对应 KOOK 消息添加 reaction（emoji：`🔗`）。

#### Scenario: Reaction 添加成功
- **WHEN** cron 绑定成功并更新 apply（写入 `event_id/battle_id` 且 `status` 推进到 `pending_audit`）
- **AND** apply 存在 `msg_id`（消息 id）
- **AND** 环境变量 `KOOK_BOT_TOKEN` 可用
- **THEN** 系统调用 KOOK API（通过 KOOK SDK）对该 `msg_id` 添加 `🔗` reaction

#### Scenario: Reaction 跳过
- **WHEN** cron 绑定成功
- **AND** apply 缺少 `msg_id`
- **THEN** 系统跳过 reaction，不影响绑定结果

#### Scenario: Reaction 失败不影响绑定结果
- **WHEN** cron 绑定成功
- **AND** KOOK reaction 请求失败（网络/限流/权限等）
- **THEN** 系统不回滚数据库绑定结果，不改变 apply 当前状态，仅记录为一次失败（允许后续通过人工或其他方式处理）

## MODIFIED Requirements
### Requirement: Cron 自动绑定流程副作用
原 cron 自动绑定流程在“绑定成功”时新增一个副作用：对 KOOK 原消息添加 reaction。

## REMOVED Requirements
（无）

