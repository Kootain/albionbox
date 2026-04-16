# 补装申请页补装流程 Spec

## Why
当前补装申请（审批）页面只能分页查看 apply 列表，缺少从“待审批 apply”快速生成补装工单（ticket preview）的工作流，导致人工筛选战斗、确认 mass 战斗、以及跳转工单预览耗时且容易遗漏。

## What Changes
- 前端：在补装申请页面增加“开始补装”按钮与补装流程视图：选择开始时间、加载待审批 apply、聚合为 battle 列表、展示战斗信息、支持标记 MASS、支持删除 apply、并可一键进入补装工单预览（ticket preview）。
- 后端：新增按开始时间筛选“待审批 apply”的查询接口（以 apply 的死亡时间为准）。
- 复用既有能力：battle tag 的批量查询/写入接口；战斗详情弹窗复用既有 BattleDetail 详情页组件；生成工单复用既有 ticket preview 跳转逻辑。

## Impact
- Affected specs: 补装审批页、战斗标签（MASS 标记）、补装工单预览（ticket preview）
- Affected code:
  - `apps/web/src/pages/guild-dashboard/GuildDashboardPage.tsx`（向补装审批页传入 guildId 与 preview 跳转回调）
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`（新增补装流程 UI/交互）
  - `apps/web/src/pages/guild-dashboard/tabs/battle-report-components/BattleDetail.tsx`（作为详情弹窗内容复用）
  - `apps/api/src/modules/regear_apply/router.ts`（新增筛选接口）
  - `packages/shared/src/schemas/regear_apply.ts`（新增接口 schema）

## ADDED Requirements
### Requirement: 补装流程入口
系统 SHALL 在补装申请页面提供“开始补装”按钮以进入补装流程。

#### Scenario: 打开开始时间选择弹窗
- **WHEN** 用户点击“开始补装”
- **THEN** 系统弹出弹窗要求用户选择一个开始时间（日期时间）

### Requirement: 查询补装候选 apply
系统 SHALL 在用户选择开始时间后，查询死亡时间大于该开始时间的所有“待审批（pending_audit）” apply，并将其作为补装候选集合返回。

#### Scenario: 查询成功
- **WHEN** 用户确认开始时间 `startTime`
- **THEN** 系统调用候选查询接口，并返回满足条件的 apply 列表

#### Scenario: 查询失败
- **WHEN** 候选查询接口返回错误
- **THEN** 页面展示错误态并允许用户重试

### Requirement: 聚合并展示战斗列表
系统 SHALL 将候选 apply 按 `battleId` 聚合为战斗列表，并展示每场战斗的关键信息与关联 apply。

#### Scenario: 战斗排序优先级
- **WHEN** 系统渲染战斗列表
- **THEN** 优先展示“没有任何 tag 且不是 MASS”的战斗（在列表靠前）

### Requirement: 拉取并展示 battle tag
系统 SHALL 对候选 battleId 列表批量拉取 battle tag（BattleType[]），并在战斗列表中展示。

#### Scenario: 批量查询
- **WHEN** 候选列表包含 battleId 集合
- **THEN** 前端批量调用 battle tag 查询接口，并合并到战斗数据中

### Requirement: 战斗详情弹窗（复用详情页）
系统 SHALL 在每条战斗旁提供“详情”按钮，点击后弹出模态框展示该 battle 的详情，并复用既有 BattleDetail 详情页组件。

#### Scenario: 查看详情
- **WHEN** 用户点击某条 battle 的“详情”
- **THEN** 弹出模态框，并在模态框内渲染 BattleDetail（battleIds 为该单条 battleId）

### Requirement: 标记战斗为 MASS
系统 SHALL 允许用户在战斗列表中将战斗标记为 MASS，并持久化为 battle tag（BattleType.MASS）。

#### Scenario: 标记为 MASS
- **WHEN** 用户对某 battle 执行“标记为 MASS”
- **THEN** 系统调用 battle tag upsert 接口，将该 battle 的 types 设置为包含 MASS（并保留其它既有 types）

#### Scenario: 取消 MASS
- **WHEN** 用户对某 battle 取消 MASS
- **THEN** 系统调用 battle tag upsert 接口移除 MASS（并保留其它既有 types）

### Requirement: 删除 apply
系统 SHALL 允许用户在补装流程中删除某条 apply，并在删除成功后从候选集合与 UI 中移除。

#### Scenario: 删除成功
- **WHEN** 用户在某条 apply 上点击“删除”
- **THEN** 系统调用 apply 删除接口，成功后从页面移除该 apply；若该 battle 下已无剩余 apply，则该 battle 从列表移除

### Requirement: 生成补装工单（进入 ticket preview）
系统 SHALL 提供“生成补装工单”按钮，将当前候选战斗集合进入 ticket preview 流程。

#### Scenario: 存在非 MASS 战斗时提醒
- **WHEN** 用户点击“生成补装工单”且候选战斗中仍存在非 MASS 的战斗
- **THEN** 系统弹窗提醒用户仍有非 MASS 战斗；用户确认后才继续进入 ticket preview

#### Scenario: 进入 ticket preview
- **WHEN** 用户确认生成
- **THEN** 系统复用既有 ticket preview 跳转逻辑，并将 battleIds 作为预览输入

## MODIFIED Requirements
### Requirement: 补装申请页面输入上下文
补装申请页面 SHALL 获得当前 guildId 上下文，用于 battle tag 查询/写入，以及与 ticket preview 逻辑一致的跳转输入。

## REMOVED Requirements
无

