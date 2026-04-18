# 补装装备勾选功能 Spec

## Why
目前补装工单列表中，只能记录某条死亡记录的整体补装状态（待补装、已完成等），但无法具体到某个装备栏位是否已经补发。增加勾选装备功能可以帮助后勤人员记录每一件装备的补发进度，避免遗漏或重复补装。

## What Changes
- **Database**: 在 `regears` 表中增加 `regeared_slots` 字段（JSON 字符串），用于存储已补装的装备栏位数组。
- **Schema**: 更新 `@albionbox/shared` 中的 `UpdateRegearStatusSchema`，支持 `regearedSlots` 字段。
- **API**: 修改 `updateStatusHandler` 接口，支持只更新 `regearedSlots` 字段（状态不变时跳过状态流转校验）。
- **Frontend State**: 在 `RegearRecord` 类型中增加 `regearedSlots?: string[]`。
- **UI**: 
  - 在 `RegearDetail.tsx` 的装备详情渲染部分，给每个装备槽位添加点击事件 `onClick`。
  - 对于已经包含在 `regearedSlots` 数组中的栏位，在装备图标上方展示一个透明的绿色蒙层。
  - 再次点击装备时，取消勾选状态并更新数据。
  - 移除下方“补装物品统计”模块自带的状态筛选器（`equipmentStatusFilter`），统一使用上方“死亡记录与补装状态”模块的筛选器（`statusFilter`）控制双端列表数据。
  - 在“补装物品统计”中聚合数据时，自动排除那些已经被勾选（在 `regearedSlots` 中）的装备。

## Impact
- Affected specs: 补装工单记录展示、状态更新。
- Affected code:
  - `packages/db/src/schema/regear.ts`
  - `packages/shared/src/schemas/regear.ts`
  - `apps/api/src/modules/regear/router.ts`
  - `apps/web/src/pages/guild-dashboard/tabs/regear-components/types.ts`
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/regear-components/RegearDetail.tsx`

## ADDED Requirements
### Requirement: 装备槽位勾选
The system SHALL provide 记录并展示装备槽位勾选状态的能力。

#### Scenario: 勾选装备
- **WHEN** 用户在补装工单详情中点击某个玩家死亡记录里的具体装备图标
- **THEN** 该装备应显示透明的绿色蒙层，并同步调用 API 保存状态到 `regeared_slots` 字段。

#### Scenario: 取消勾选装备
- **WHEN** 用户再次点击已勾选的装备图标
- **THEN** 绿色蒙层消失，并同步调用 API 从 `regeared_slots` 字段中移除该栏位。

## MODIFIED Requirements
### Requirement: 状态流转 API 兼容
修改现有的状态更新 API，使其能够在 `status` 字段保持不变时，正常更新 `regearedSlots` 字段而不触发状态转换的错误校验。
