# Enhance Regear Apply List Spec

## Why
当前补装申请列表页面中，单行申请的渲染逻辑与页面其它逻辑耦合紧密，造成代码臃肿且不易复用。同时，现有展示模式仅支持按“战斗 (Battle)”进行分组展示，用户在管理不同战斗间近乎同时发生的申请时不够直观。因此，我们需要将单行提取为独立组件，并增加“按战斗分组”的视图切换开关，支持按创建时间倒序的平铺视图，从而提升复用性和用户体验。

## What Changes
- 将补装申请列表的单行渲染内容抽取为一个独立的 React 组件 (`RegearApplyRow`)。
- 在“补装申请”页面增加一个“按战斗分组”的开关 (Toggle Switch)，默认处于开启状态。
- 当“按战斗分组”开关开启时，展示原有分组视图；关闭时，将当前过滤后的所有申请展开为一维数组，按 `createTime` 从大到小排序，采用平铺列表展示。

## Impact
- Affected specs: 补装申请展示逻辑 (Regear Approval Tab)
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`
  - (新增) `apps/web/src/pages/guild-dashboard/tabs/regear-components/RegearApplyRow.tsx`

## ADDED Requirements
### Requirement: 独立补装申请行组件
系统应当将原 `RegearApprovalTab` 中的单行申请（含玩家信息、死亡时间、装备图、KOOK消息、状态Badge及删除操作等）抽离封装为一个纯展示组件。

### Requirement: 战斗分组视图切换
系统应当允许用户在“按战斗分组”与“时间平铺”视图间切换。
#### Scenario: 切换为平铺视图
- **WHEN** 用户关闭“按战斗分组”开关
- **THEN** 隐藏战斗概览头部信息（Battle ID, 时间范围, 击杀数等），将所有补装申请展开为一层列表。
- **THEN** 列表项严格按照 `createTime` 的降序进行排序展示。

## MODIFIED Requirements
### Requirement: 补装申请展示
原有的战斗分组逻辑保留作为默认行为，但其内部申请行的渲染改为调用 `RegearApplyRow` 组件。