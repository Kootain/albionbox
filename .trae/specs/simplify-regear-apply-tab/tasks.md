# Tasks

- [x] Task 1: 替换“补装审批”文案为“补装申请”
  - [x] 搜索并修改 `apps/web/src/i18n/zh.json` (或可能存在的英文 `en.json`) 中的 `"补装审批"` 为 `"补装申请"`。主要对应 `guild_dashboard.tabs.regear_approval` 等。

- [x] Task 2: 移除后端接口和共享库对 `startTime` 的强制要求
  - [x] 修改 `packages/shared/src/schemas/regear_apply.ts` 中的 `ListRegearApplySupplementCandidatesQuerySchema`，将 `startTime` 设为 `optional`，或直接移除。
  - [x] 修改 `apps/api/src/modules/regear_apply/router.ts`，如果 `startTime` 不存在，则返回全部 `pending_audit` 数据，不进行 `filter`。

- [x] Task 3: 优化 `RegearApprovalTab.tsx` 中的补装候选加载逻辑
  - [x] 删除 `supplementStartOpen` 状态和 `supplementStartTimeLocal` 状态。
  - [x] 删除界面上的 `Modal` 和 "开始补装" 的 `Button`。
  - [x] 增加 `useEffect`：当 `view === 'supplement'` 时，自动调用 `loadSupplementCandidates`（不传或传入空 `startTime`）。
  - [x] 删除 `handleStartSupplement` 等无效函数。
  - [x] 检查并确保在“补装候选”视图下，可以正常生成工单并使用 `needApply=true`。

# Task Dependencies
- Task 3 depends on Task 2