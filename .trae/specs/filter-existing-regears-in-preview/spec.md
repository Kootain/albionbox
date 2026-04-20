# Preview Fetch Un-excluded Regears Spec

## Why
在补装 Preview 页面，系统已经能拉取和 `battleIds` 关联的 events 和对应的 applies，但还需要额外拉取相关的 `regears`（非 excluded，且未被删除），以便合并过滤，防止创建重复的非排除状态的补装记录。同时，在工单创建接口中也应当对这些非 excluded 的死亡记录进行拦截和过滤。

## What Changes
- 修改 `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx` 中的 Preview 构建逻辑：
  - 加载 `existingRegears` 后，查找并标记该 `eventId` 对应的现存记录。
  - 在最终生成预览时过滤掉那些已经存在并且状态为**非 excluded** 的 `regears` 记录，确保同一个 event 不会在预览和新建阶段被重复创建。
- 修改 `apps/api/src/modules/regear/router.ts` 中创建 ticket 的逻辑（已完成部分过滤逻辑，确认无需修改，当前 API 已经在 chunk select 时排除了 `ne(regears.status, 'excluded')` 的记录，并且在插入时自动过滤）。

## Impact
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`

## ADDED Requirements
### Requirement: 防止重复补装记录创建
系统应当在 Preview 阶段过滤掉已经有非 `excluded` 状态的 `regears` 的事件。

#### Scenario: 预览数据合并
- **WHEN** 用户触发补装预览
- **THEN** 系统拉取 events 和现有的 `regears`，并在生成预览列表前，将 `eventId` 已存在于非 `excluded` 状态的 `regears` 中的记录剔除。