# Add Guild Cycle Rewards Spec

## Why
我们需要基于现有的工会力量榜快照数据（`guild_rankings`）实现“结算周期奖励”。管理员在前端配置结算规则并触发生成结算明细，用于后续发放与回溯。

## What Changes
- 新增两张数据表：
  - 结算周期表：记录周期起止、关联的 `guild_rankings` 快照 ID 列表、结算配置 JSON、主键结算 ID。
  - 结算明细表：记录周期内每个玩家/平台账号在某种奖励类型/子类型下的一条奖励记录，包含银币金额、发放状态与差异化 detail JSON。
- 新增后端结算模块：
  - 创建结算周期接口（包含配置与导入表格数据），服务端根据规则插件依次生成结算明细。
  - 结算查询接口：支持获取周期列表、周期详情（含按玩家聚合视图所需的数据）。
  - 发放状态切换接口：按“玩家聚合行”一键标记/撤回该玩家在该周期下的全部奖励明细发放状态，并记录操作人/时间。
- 新增前端结算页面：
  - 在工会大盘新增入口 Tab（或二级页面入口），支持创建结算周期（模态框配置 + 导入表格）。
  - 创建完成后展示结算结果页面：默认按玩家聚合展示（纵轴玩家，横轴奖励类型+子类型），并展示合计与发放状态切换。
  - 支持第二种视图（按明细/按奖励记录列表）用于核对。
- **不包含**：周期性定时采集/自动上报（数据上报仍由用户手动执行）。

## Impact
- Affected specs: 基于力量榜的周期奖励结算、展示与发放状态管理。
- Affected code:
  - `packages/db/src/schema/*`（新增结算相关 schema）
  - `packages/db/migrations/*`（新增迁移）
  - `packages/shared/src/schemas/*`（新增结算相关 DTO/Schema）
  - `apps/api/src/modules/*`（新增 settlements/rewards 模块与路由）
  - `apps/web/src/pages/guild-dashboard/*`（新增入口与页面）
  - `apps/web/src/i18n/zh.json` & `en.json`

## ADDED Requirements
### Requirement: 结算周期数据模型
The system SHALL store each settlement cycle with start/end date, associated `guild_rankings` snapshot IDs, and a JSON settlement configuration.

#### Data: SettlementCycle
- `id`: UUID（结算 ID）
- `guildId`: string
- `startDate`: string（YYYY-MM-DD）
- `endDate`: string（YYYY-MM-DD）
- `rankingIds`: JSON string
  - 用于保存本周期关联的 `guild_rankings` 的 id 列表/映射（详见后文“快照选择规则”）
- `config`: JSON string
  - 保存结算配置与导入数据（详见后文“配置结构”）
- `createdAt`: ISO string
- `createdByUserId`: string（可为空；使用当前登录用户 id，若系统未能取到则为空）

#### Scenario: Success case
- **WHEN** guild 管理员创建结算周期
- **THEN** 系统创建一条 SettlementCycle 记录并返回结算 ID

### Requirement: 结算明细数据模型
The system SHALL store one settlement detail record per (cycle, rewardType, subType, recipientKey).

#### Data: SettlementDetail
- `id`: UUID
- `guildId`: string（冗余，便于按工会过滤）
- `settlementId`: UUID
- `recipientKey`: string（聚合与批量切换用的收款人键，生成时写入）
- `rewardType`: string（已支持三种：`MIGHT_REWARD`、`MIGHT_TOP_REWARD`、`RESOURCE_REWARD`；未来可扩展）
- `subType`: string（不同奖励的子类型，详见后文）
- `username`: string | null（来自 `guild_rankings` 的玩家名；可为空）
- `platformId`: string | null（第三方平台用户 id；可为空）
- `platformType`: string | null（`kook` / `discord`；可为空）
- `coinAmount`: integer（银币金额，单位：银币）
- `isPaid`: boolean
- `paidAt`: ISO string | null
- `paidByUserId`: string | null
- `detail`: JSON string（不同奖励类型/子类型的差异化字段，结构不强约束）
- `createdAt`: ISO string

#### Recipient Identity Rule
- 系统 SHALL 为每条明细计算一个“收款人键”用于聚合展示：
  - 若 `username` 非空：`username:{username}`
  - 否则若 `platformType` 与 `platformId` 非空：`platform:{platformType}:{platformId}`
  - 否则：该明细为无效数据，创建时应被拒绝（400）

### Requirement: 子类型与 detail 结构
The system SHALL support the following reward types and detail schemas.

#### Reward: 力量奖励（MIGHT_REWARD）
- `subType`: 力量类型（复用 `RankingType`，且仅对配置选中的类型生成）
- `detail`：
  - `totalMightRaw`: number（原始 might 值）
  - `totalMight`: number（展示口径 might，建议与现有 UI 一致：`round(raw / 10000)`）
  - `effectiveMight`: number（参与奖励计算的 might）
  - `overThreshold`: boolean
  - `threshold`: number（当期阈值）
  - `ratio`: number（当期比例，coin per might）

#### Reward: 力量 TOP 奖励（MIGHT_TOP_REWARD）
- `subType`: 力量类型（复用 `RankingType`，且仅对配置选中的类型生成）
- `detail`：
  - `rank`: number（1-based）
  - `totalMightRaw`: number
  - `totalMight`: number

#### Reward: 能量核心&力量水晶奖励（RESOURCE_REWARD）
- `subType`: `POWERCORE` 或 `ENERGYCRYSTAL`
- `detail`：
  - `counts`: `{ green: number, blue: number, purple: number, gold: number }`
  - `coinPerUnit`: `{ green: number, blue: number, purple: number, gold: number }`
  - `totalUnits`: number

### Requirement: 创建结算周期与生成明细（插件化）
The system SHALL generate settlement details using a plugin-like generator per rewardType.

#### Generator Interface (logical)
- `generate(cycle, inputs) -> SettlementDetail[]`
- 每种 `rewardType` 一个 generator，便于未来增改。

#### Scenario: Success case
- **WHEN** guild 管理员提交“创建结算周期”配置并确认
- **THEN** 系统在同一次请求中：
  - 创建 SettlementCycle
  - 根据配置依次运行各奖励 generator
  - 批量写入 SettlementDetail
  - 返回结算周期 ID 与生成数量摘要

### Requirement: 快照选择规则（关联 guild_rankings）
The system SHALL resolve and store the `guild_rankings` snapshot IDs that are used for the settlement.

#### Rule
- 对每个参与结算的力量类型（`RankingType`）：
  - 在 `guild_rankings` 中选择 `collectedAt <= endDate 23:59:59.999` 的最新一条记录作为该类型在本周期的结算快照
  - 将这些快照 ID 记录到 `SettlementCycle.rankingIds` 中（建议结构：`{ [rankingType: string]: string }`）
- 若某个被选中的力量类型找不到可用快照：
  - 创建结算周期 SHALL 失败，并在响应中返回缺失的类型列表

### Requirement: 结算配置结构（config JSON）
The system SHALL store settlement configuration as JSON on the cycle record.

#### Config: `SettlementConfig` (v1)
- `version`: `"v1"`
- `mightReward`:
  - `enabledTypes`: `RankingType[]`
  - `threshold`: number
  - `ratio`: number（coin per might）
  - `effectivePolicy`: `"ZERO_BELOW_THRESHOLD"`（默认，且当前版本固定为该策略）
- `mightTopReward`:
  - `enabledTypes`: `RankingType[]`
  - `topConfigByType`: `{ [rankingType: string]: { rewards: Array<{ rank: number, coinAmount: number }> } }`
- `resourceReward`:
  - `powercore`: `{ coinPerUnitByColor: { green:number, blue:number, purple:number, gold:number } }`
  - `energycrystal`: `{ coinPerUnitByColor: { green:number, blue:number, purple:number, gold:number } }`
  - `imports`:
    - `powercoreTable`: `Array<{ username?: string, kookId?: string, discordId?: string, green:number, blue:number, purple:number, gold:number }>`
    - `energycrystalTable`: `Array<{ username?: string, kookId?: string, discordId?: string, green:number, blue:number, purple:number, gold:number }>`

#### Import Format
- 系统 SHALL 支持导入 CSV（推荐且当前版本仅需支持 CSV）。
- CSV 第一行表头固定为：`username,kookId,discordId,green,blue,purple,gold`
- `username/kookId/discordId` 三列中至少一列必填（可只填其中一列）。
- 当行填写 `username` 时，生成的明细使用 `username` 作为收款人；当行填写 `kookId/discordId` 时，生成的明细使用 `platformType/platformId` 作为收款人（platformType 分别为 `kook` / `discord`）。
- 数量字段默认为 0；所有数量字段应为非负整数。

### Requirement: 结算结果展示（按玩家聚合）
The system SHALL provide a settlement result view aggregated by recipient (player).

#### Aggregation Rules
- 行：按 Recipient Identity Rule 的 `recipientKey` 聚合
- 列：所有出现过的 `(rewardType, subType)` 的组合，按稳定顺序渲染
- 单元格值：该玩家在该列下的 `coinAmount` 之和（通常为 0 或 1 条）
- 合计：该玩家所有列的 `coinAmount` 之和
- 发放状态列：
  - 若该玩家在该周期下所有明细均 `isPaid=true`，显示 ✅
  - 否则显示“发放”按钮

#### Numeric Formatting
- 展示 coinAmount/合计时 SHALL 使用统一单位格式：
  - `>= 1,000,000` 使用 `m`；`>= 1,000` 使用 `k`；否则无单位
  - 仅保留小数点后两位
  - 每次展示只使用一种单位（单个数值按其自身大小选择单位，不混用单位）

### Requirement: 发放状态切换（按玩家聚合行）
The system SHALL allow toggling paid/unpaid state for all settlement details of a recipient in a cycle.

#### Scenario: Mark as paid
- **WHEN** 管理员在“按玩家聚合”视图点击某行的“发放”
- **THEN** 系统把该周期下该收款人（recipientKey）的全部明细设置为 `isPaid=true`，并写入 `paidAt` 与 `paidByUserId`

#### Scenario: Revoke paid
- **WHEN** 管理员在“按玩家聚合”视图点击 ✅
- **THEN** 系统把该周期下该收款人（recipientKey）的全部明细设置为 `isPaid=false`，并清空 `paidAt/paidByUserId`

## MODIFIED Requirements
### Requirement: 无
无现有需求被修改；本功能以新增模块形式接入。

## REMOVED Requirements
### Requirement: 无
**Reason**: 不涉及移除既有能力。
**Migration**: 无。
