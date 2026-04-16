# 战报战斗标记（Battle Tagging）Spec

## Why
战报模块需要支持对战斗进行“标记/打标签”，以便在工会大盘的战报列表中快速识别与筛选同类战斗。

## What Changes
- 后端：确认并补齐“战斗标记”相关 API（写入/查询 battles 表中的标签信息）。
- 前端：工会大盘页面「战报」Tab 列表删除当前“类型”列，用该列展示战斗标签；支持点击标签进行编辑并保存。

## Impact
- Affected specs: 战报列表展示、战斗标签维护（battle tagging）
- Affected code:
  - `apps/api/src/modules/guilds/guilds.router.ts`（战斗标签 upsert / 批量查询）
  - `packages/db/src/schema/battles.ts`（battles 表：已存在，仅校验映射）
  - `packages/shared/src/schemas/battles.ts`（BattleType 编解码/类型）
  - `apps/web/src/pages/guild-dashboard/tabs/battle-report-components/BattleList.tsx`（列表列变更 + 标签编辑）
  - `apps/web/src/i18n/{zh,en}.json`（列标题与标签文案）

## ADDED Requirements
### Requirement: 战斗标签写入（标记战斗）
系统 SHALL 支持对指定工会、指定服务器下的 battle 写入/更新战斗标签（BattleType[]），并持久化到 `battles` 表的 `types` bitmask 字段中。

#### Scenario: 新增标记
- **WHEN** 用户在前端对某条 battle 保存标签（提供 `server` 与 `types`）
- **THEN** 后端在 `battles` 表中 upsert 一条记录（主键：`(id, server, guild_id)`），并写入对应 `types` bitmask

#### Scenario: 更新标记
- **WHEN** battle 已存在且用户再次保存标签
- **THEN** 后端更新该记录的 `types` 与 `updated_at`

#### Scenario: 清空标记
- **WHEN** 用户保存空数组 `types: []`
- **THEN** 后端将 `types` 持久化为 `0`（表示无标签）

### Requirement: 战斗标签批量查询
系统 SHALL 支持按 `(guild_id, server, battle ids[])` 批量查询 battles 的标签信息，并以 `BattleType[]` 形式返回，供战报列表渲染。

#### Scenario: 查询成功
- **WHEN** 前端提交 `server` 与 `ids[]`（至少 1 个）
- **THEN** 后端返回 `battles` 记录列表，且每条记录的 `types` 被解码为 `BattleType[]`

### Requirement: 战报列表展示标签并支持编辑
系统 SHALL 在工会大盘的战报列表中展示战斗标签，并允许用户点击标签进行编辑后保存到后端。

#### Scenario: 列表展示
- **WHEN** 用户打开工会大盘「战报」Tab 列表
- **THEN** 列表不再展示当前“类型”列（聚合/单场），改为展示“标签”列（来自 battles 表的 `types`）

#### Scenario: 编辑保存
- **WHEN** 用户点击某条 battle 的标签区域并提交修改
- **THEN** 前端调用战斗标签写入 API 保存，保存成功后列表立即反映最新标签

## MODIFIED Requirements
### Requirement: 战报列表列定义
将战报列表的“类型”列替换为“标签”列（用于展示与编辑 battle tagging 信息）。

## REMOVED Requirements
### Requirement: 战报列表展示“类型（聚合/单场）”
**Reason**: 该列位置用于展示战斗标签，以满足“标记战斗”的核心诉求。
**Migration**: 无（仅 UI 展示变更）。
