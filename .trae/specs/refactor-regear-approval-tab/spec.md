# Refactor Regear Approval Tab Spec

## Why
目前补装申请页面存在“申请列表”和“补装候选”两个模块，功能存在一定的割裂。为了提升用户体验并简化操作流，需要将补装候选模块的核心能力（按 battleId 聚合展示、生成工单、标记 MASS、显示战斗详情等）完全集成到申请列表里，并取消申请列表的分页，改为一次性加载待审核记录。

## What Changes
- **BREAKING**: 删除页面顶部的视图切换按钮（申请列表 / 补装候选）。
- **BREAKING**: 移除“补装候选”专属模块代码。
- 移除申请列表的分页逻辑和组件，一次性请求获取待审核的补装申请。
- 将拉取到的补装申请按 `battleId` 进行聚合，并在界面上呈现为按战斗分组的列表（或块级视图）。
- 在每个 `battleId` 分组处集成“标记 MASS”和“战斗详情”按钮。
- 申请列表操作栏内需保留之前的删除按钮以及详情、查看图片等功能。
- 在页面顶部/表头处增加“生成补装工单”按钮，点击时检查所有含申请记录的 `battleId` 并触发工单生成。

## Impact
- Affected specs: Regear approval tab structure and data fetching.
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`

## ADDED Requirements
### Requirement: 聚合展示补装申请与工单生成
补装申请将直接在单个视图中按战斗分组展示，并提供全局的工单生成入口。

#### Scenario: Success case
- **WHEN** 用户进入“补装申请”页面
- **THEN** 页面无分页地加载申请记录，并按 battleId 聚合展示。用户可在顶部直接点击“生成补装工单”。

## MODIFIED Requirements
### Requirement: 取消分页
移除由于数据量限制带来的翻页操作，一次性加载所有当前筛选条件下的申请，由前端或后端配合实现全量数据聚合。

## REMOVED Requirements
### Requirement: 补装候选独立视图
**Reason**: 统一审核入口与候选操作，降低心智负担。
**Migration**: 功能已迁移并内嵌至主申请列表页面。
