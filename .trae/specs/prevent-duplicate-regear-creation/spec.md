# Prevent Duplicate Regear Creation Spec

## Why
在补装 Preview 页面，我们需要拉取与 `battleIds` 关联的、未删除的 `regears` 记录（非 `excluded` 状态的记录代表它们已经在其他工单中被处理过）。在前端预览阶段以及后端创建工单阶段，都不应该重复拉取并创建这些“已在别的工单中处理”的死亡记录，否则会导致同一个玩家的同一场死亡被重复补装。

## What Changes
- **前端 `RegearTab.tsx`**：在拉取到 `existingRegears` 之后，生成 `recordsMap` 时，检查该 `eventId` 是否已经在 `existingRegears` 中。如果在且 `status !== 'excluded'`，则说明已经在其他工单处理了，这部分记录应该从预览列表中**直接丢弃**（过滤掉）。
- **后端 `apps/api/src/modules/regear/router.ts`**：
  - 目前 API 的 `existing` 查询中使用了 `ne(regears.status, 'excluded')` 的条件，找出了那些已经在处理中的事件。
  - 在遍历 `normalizedEventEntries` 插入 `regearsToInsert` 之前，检查 `eventId` 是否在 `existing` 数组中。如果存在（意味着有非 `excluded` 的记录），则 `return`（即过滤掉，不为它创建新的 `regear` 记录）。
  - 这部分逻辑实质上已经实现了一半，只需要确认语义一致：**不创建已有非 `excluded` 状态 regear 的记录**。如果因为某些原因用户试图强制提交这些记录，后端也应当直接将它们丢弃。

## Impact
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`
  - `apps/api/src/modules/regear/router.ts`

## ADDED Requirements
### Requirement: 前端与后端拦截已处理的记录
在从 Battle 生成死亡记录以及落库时，系统 SHALL 过滤掉那些已经在其他工单中且状态不是 `excluded` 的记录。

#### Scenario: 预览数据合并
- **WHEN** 用户触发补装预览
- **THEN** 任何在数据库中存在且 `status !== 'excluded'` 的事件，不会出现在最终的 `generatedRecords` 列表中。

#### Scenario: 创建工单
- **WHEN** 用户提交工单创建请求
- **THEN** 后端如果检测到请求体中的某个 `eventId` 已经在数据库中有非 `excluded` 的记录，则跳过该记录的创建（或返回冲突提示），防止重复补装。