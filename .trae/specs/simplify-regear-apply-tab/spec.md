# Simplify Regear Apply Tab Spec

## Why
当前补装审批页面文案不够准确，并且“补装候选”流程中需要先点击“开始补装”并选择时间，增加了操作成本。用户希望文案更为直观，并且在点击“补装候选”后直接拉取所有处于待审核（pending_audit）状态的申请，无需再手动选择时间。

## What Changes
- 修改文案：“补装审批” -> “补装申请”。
- 移除补装候选页面的“开始补装”按钮及其触发的时间选择弹窗。
- 移除 `loadSupplementCandidates` 时对 `startTime` 的依赖，直接在进入“补装候选”视图（或切换到该视图时）自动拉取所有处于 `pending_audit` 状态的申请。
- 后端移除 `supplement-candidates` 接口对 `startTime` 必传的校验，或者直接在全量返回时不进行时间过滤。

## Impact
- Affected specs: 补装审批页签展示与补装候选流程。
- Affected code:
  - `apps/web/src/i18n/zh.json` (及相关国际化文件)
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`
  - `apps/api/src/modules/regear_apply/router.ts`
  - `packages/shared/src/schemas/regear_apply.ts`

## ADDED Requirements
### Requirement: 补装候选自动加载
The system SHALL automatically load all pending_audit regear applies when the user switches to the "补装候选" (Supplement) view, without prompting for a start time.

#### Scenario: Success case
- **WHEN** user switches to "补装候选" view
- **THEN** all pending_audit applies are fetched and grouped by battleId immediately.

## REMOVED Requirements
### Requirement: Start Time Filter for Supplement Candidates
**Reason**: 增加操作成本，用户希望直接处理所有待审核的记录。
**Migration**: 移除前端“开始补装”按钮、弹窗以及后端对 `startTime` 的强制过滤。