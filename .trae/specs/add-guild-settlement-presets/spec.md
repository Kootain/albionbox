# 工会结算默认配置 Preset Spec

## Why
创建结算周期时，力量奖励/力量TOP奖励/能量核心/力量水晶等参数经常在同一个工会内反复使用。将这些参数沉淀到“工会配置”中作为默认值，可以减少重复配置与出错概率。

## What Changes
- 在“工会配置页”新增一份“结算默认配置（Preset）”表单：
  - 可配置：力量奖励、力量TOP奖励、能量核心单价、力量水晶单价。
  - 不包含：CSV 导入数据（powercoreTable/energycrystalTable）。
  - 保存到 `guild_settings` 中。
- 在“创建结算周期”面板中：
  - 打开/选择工会后，优先读取 `guild_settings` 中的 preset 作为默认值填充表单（仅用于初始化）。
  - CSV 导入数据仍由用户在创建结算时单独导入。

## Impact
- Affected specs: 结算周期创建体验；工会设置模型扩展。
- Affected code:
  - `packages/db/src/schema/guilds.ts`（扩展 guild_settings）
  - `packages/db/migrations/*`（新增迁移）
  - `packages/shared/src/schemas/guild.ts`（扩展 UpdateGuildSettingsSchema）
  - `packages/shared/src/schemas/settlements.ts`（复用/抽取 preset schema）
  - `apps/api/src/modules/guilds/guild_settings.router.ts`（读写 preset 字段）
  - `apps/web/src/pages/guild-dashboard/tabs/SettingsTab.tsx`（新增 preset 配置 UI）
  - `apps/web/src/pages/guild-dashboard/tabs/SettlementsTab.tsx`（创建结算时加载 preset 并初始化表单）

## ADDED Requirements
### Requirement: guild_settings 存储结算默认配置
The system SHALL store settlement preset configuration per guild in `guild_settings`.

#### Data: guild_settings (新增字段)
- `settlementPreset`: JSON | null（建议字段名：`settlement_preset`，json mode）

#### settlementPreset (logical shape)
基于结算配置 `SettlementConfig` 的子集（不包含 imports）：
- `version`: `"v1"`
- `mightReward`：
  - `enabledTypes: RankingType[]`
  - `threshold: number`
  - `ratioByType: Record<RankingType, number>`
- `mightTopReward`：
  - `enabledTypes: RankingType[]`
  - `topConfigByType: Record<RankingType, { rewards: Array<{ rank: number; coinAmount: number }> }>`
- `resourceReward`：
  - `powercore.coinPerUnitByColor: { green, blue, purple, gold }`
  - `energycrystal.coinPerUnitByColor: { green, blue, purple, gold }`

#### Scenario: Success case
- **WHEN** guild 管理员在工会配置页保存 preset
- **THEN** preset 被持久化到该 guild 的 `guild_settings`

### Requirement: 工会配置页支持编辑并保存 preset
The system SHALL provide a UI to edit and save settlement preset in the guild settings page.

#### Behavior
- **WHEN** 用户进入工会配置页
- **THEN** 页面从 `GET /guilds/:id/settings` 读取 preset 并回填
- **WHEN** 用户修改并点击保存
- **THEN** 页面调用 `PUT /guilds/:id/settings` 更新 `settlementPreset`

#### Permissions
- `guild:view`：可查看 preset
- `guild:manage`：可修改 preset

### Requirement: 创建结算周期时用 preset 初始化表单
The system SHALL use the guild settlement preset as default values when creating a settlement cycle.

#### Behavior
- **WHEN** 用户打开“创建结算周期”模态框
- **THEN** 前端从 `GET /guilds/:id/settings` 读取 `settlementPreset`
- **AND** 若 preset 存在：
  - 初始化 mightReward/mightTopReward/resourceReward 单价相关表单状态为 preset
  - `powercoreTable/energycrystalTable` 初始化为空（仍需导入）
- **AND** 若 preset 不存在：使用现有页面默认值（0 或空选择）

#### Scenario: Success case
- **WHEN** 工会已保存 preset
- **AND** 管理员创建结算周期
- **THEN** 打开创建面板即显示该 preset 作为默认配置

## MODIFIED Requirements
### Requirement: UpdateGuildSettingsSchema
`PUT /guilds/:id/settings` 的 schema 需要支持写入 `settlementPreset`（可选/可空）。

## REMOVED Requirements
### Requirement: 无
**Reason**: 不移除既有能力。
**Migration**: 无。

