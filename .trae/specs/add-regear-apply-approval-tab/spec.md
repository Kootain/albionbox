# 补装审批 Tab Spec

## Why
当前补装申请（regear_apply）已能被写入数据库，但工会大盘缺少一个审批入口来集中查看/筛选/处理这些申请，导致审核效率低且无法按条件快速定位目标申请。

## What Changes
- 工会大盘新增一个 Tab：补装审批（展示补装申请列表）。
- 页面支持按以下条件筛选：申请状态（status）、频道（msgChannel）、申请人（msgUserID）、受害者（victimName）。
- 后端补齐查询能力：新增 `GET /regear_applies`，支持上述过滤条件与分页。
- 暂时缺少“工会绑定 KOOK 服务器 id”的配置链路：前端在该 Tab 中先**写死** `msgGuild=1248349507148974` 作为默认筛选条件（后续可替换为可配置字段）。**TEMP**

## Impact
- Affected specs: 补装申请（regear_apply）审核/审批流程
- Affected code:
  - `apps/web/src/pages/guild-dashboard/components/GuildTabs.tsx`
  - `apps/web/src/pages/guild-dashboard/GuildDashboardPage.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/*`（新增 tab 组件）
  - `apps/api/src/modules/regear_apply/router.ts`
  - `packages/shared/src/schemas/regear_apply.ts`（新增查询 schema）

## ADDED Requirements
### Requirement: 工会大盘补装审批 Tab
系统 SHALL 在工会大盘中提供「补装审批」Tab，用于查看补装申请列表。

#### Scenario: 默认展示
- **WHEN** 用户进入工会大盘并打开「补装审批」Tab
- **THEN** 页面加载申请列表，并默认附带 `msgGuild=1248349507148974` 作为筛选条件

### Requirement: 列表筛选
系统 SHALL 支持在审批 Tab 中按以下字段筛选补装申请：
- `status`（单选或多选，以 UI 实现为准；API 至少支持单值）
- `msgChannel`
- `msgUserid`
- `victimName`（模糊匹配）

#### Scenario: 筛选成功
- **WHEN** 用户设置任一筛选条件并触发查询
- **THEN** 列表仅展示满足条件的申请记录，并按 `createTime` 倒序

### Requirement: 后端列表查询 API
系统 SHALL 提供 `GET /regear_applies` 用于查询申请列表，并支持分页与筛选。

#### Query Parameters
- `msgGuild`：string（可选，但前端默认会传，临时写死值）
- `status`：ApplyStatus（可选）
- `msgChannel`：string（可选，精确匹配）
- `msgUserid`：string（可选，精确匹配）
- `victimName`：string（可选，LIKE/contains 匹配，大小写策略按 SQLite 默认行为）
- `limit`：number（可选，默认 50，上限 200）
- `offset`：number（可选，默认 0）

#### Scenario: 查询返回结构
- **WHEN** 客户端请求 `GET /regear_applies?...`
- **THEN** 返回 `{ items: RegearApply[], total: number, limit: number, offset: number }`

## MODIFIED Requirements
### Requirement: RegearApply 模块 API 能力
补装申请模块 SHALL 在不破坏既有创建/删除/更新状态/绑定/更新详情接口的前提下，新增列表查询能力。

## REMOVED Requirements
无

