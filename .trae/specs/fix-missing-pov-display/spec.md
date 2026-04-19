# Fix Missing POV Display Spec

## Why
根据您的反馈，当视频确切存在重叠时，“POV”列表（`isPovListOpen`）里仍未展示出这些重叠的视频。经分析发现：在组件 `PlayerModal.tsx` 中，`videos` 的属性（其他视频数组）未被从父组件（即 `DashboardPage.tsx` 中的 `activeVideo` 展示逻辑处）正常传递或在某个环节被置空。

## What Changes
- **PlayerModal.tsx 传入验证**: 确保 `PlayerModal` 在计算 `otherPovs` 时所用的 `videos` 数据确切包含了全局已加载的完整视频数组。
- **排查 DashboardPage.tsx**: 检查 `videos={videos}` 的确传递给了 `<PlayerModal />`。
- **状态同步问题修复**: 若 `videos` 有值，但由于某些原因如闭包或组件没刷新导致 `otherPovs` 内没有被正确过滤出来，我们需要通过检查日志和重构 `useMemo` 的依赖来解决这一问题。
- **移除硬编码并纠正单位**: （此前已完成时间上的 ms/s 对齐转换）确认 `v.duration` 无论是否存在，`otherPovs` 的数组输出都是有效包含对象的。

## Impact
- Affected code: `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: Show Overlapping POVs in the Menu
The system SHALL list all overlapping videos inside the `POV` menu when the button is clicked.

#### Scenario: Success case
- **WHEN** user opens a video that overlaps with others and clicks "POV"
- **THEN** a dropdown list of usernames for those overlapping videos is displayed.