# Regear Preview needApply Spec

## Why
当从“补装候选”页面进入补装预览（Preview）时，用户只希望处理有对应申请单（`regear_applies`）的死亡记录。而目前系统会将整场战斗中所有同公会的死亡默认置为 `pending_review`，导致管理员需要手动将未申请的人标为 `excluded`。通过引入 `needApply` 模式，系统可以自动加载并识别哪些死亡有申请记录，从而智能分配默认状态，并在创建工单时自动绑定申请记录。

## What Changes
- **入口参数**：从 `RegearApprovalTab` 触发预览时，将 `needApply: true` 通过 `GuildDashboardPage` 的事件回调传入路由 state 中。
- **后端接口支持**：
  - 在 `apps/api/src/modules/regear/router.ts` 新增 `POST /:guildId/regear/records/by-battles` 接口，接收 `battleIds`，返回 `regears`。
  - 在 `apps/api/src/modules/regear_apply/router.ts` 新增 `POST /:guildId/regear-applies/by-battles` 接口，接收 `battleIds`，返回 `regearApplies`。
- **前端并发拉取与状态推导**：
  - 预览数据加载时，前端并发调用上述两个接口拉取 `regears` 和 `regearApplies`。
  - 状态推导逻辑：
    1. 如果有对应的 `regears` 记录（说明已处理过），直接使用其记录的 `status`。
    2. 如果没有 `regears` 记录，但传入了 `needApply = true`：
       - 若存在对应的 `regearApplies`，则状态为 `pending_review`。
       - 若不存在对应的 `regearApplies`，则状态为 `excluded`。
    3. 如果没有传入 `needApply` 或为 `false`，则保留原逻辑（状态为 `pending_review`）。
- **创建工单带参**：从 preview 中创建工单（点击生成）时，在 `POST /:guildId/regear/tickets` 请求体中带上 `needApply` 参数，触发后端自动绑定申请记录的逻辑。

## Impact
- Affected specs: 补装候选预览流程、补装记录状态计算、工单创建逻辑
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`
  - `apps/web/src/pages/guild-dashboard/GuildDashboardPage.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`
  - `apps/api/src/modules/regear/router.ts`
  - `apps/api/src/modules/regear_apply/router.ts`

## ADDED Requirements
### Requirement: 通过 BattleIds 查询记录
The system SHALL provide APIs to fetch `regears` and `regear_applies` independently by `battleIds`.

#### Scenario: Success case
- **WHEN** user requests records with `battleIds` via POST
- **THEN** returns matching `regears` or `regear_applies`.

### Requirement: 智能初始状态计算与自动绑定
The system SHALL calculate the default status of a death record based on the `needApply` flag and pass it to ticket creation.

#### Scenario: Success case (needApply = true)
- **WHEN** user enters preview with `needApply = true`
- **THEN** records with existing `regear_applies` default to `pending_review`, and records without default to `excluded`. Existing `regears` statuses override these defaults.
- **AND WHEN** user submits the ticket
- **THEN** `needApply` is passed in the payload, and the backend automatically links the apply records.