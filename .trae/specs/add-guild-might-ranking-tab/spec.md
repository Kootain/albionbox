# Add Guild Might Ranking Tab Spec

## Why
我们需要在工会大盘（Guild Dashboard）中增加一个“力量榜” (Might Rankings) Tab，以展示通过数据采集模块上传的工会赛季个人力量贡献数据。同时，由于数据采集的 `guild_id` 并不是现有的 Albion 系统中的工会 ID，我们需要在工会配置（Settings Tab）中增加一个专门的“数据采集工会 ID”绑定。最后，“力量榜”应该默认展示最新的数据，并支持按日期筛选查看该日期及之前最新的数据。

## What Changes
- 在 `SettingsTab.tsx` 中增加一个字段配置：Data Collection Guild ID（数据采集工会 ID），绑定并保存至工会的 settings 中（例如 `dataCollectionGuildId`）。
- 在 `GuildDashboardPage.tsx` 和 `GuildTabs.tsx` 中新增一个 Tab: `might-rankings` ("力量榜")。
- 创建新的组件 `apps/web/src/pages/guild-dashboard/tabs/MightRankingsTab.tsx`，用于展示力量榜数据。
- 该页面会先请求获取工会配置以拿到 `dataCollectionGuildId`，如果未配置则提示用户去 Settings 配置。
- 如果已配置，使用该 ID 调用 API 获取数据 (`GET /api/rankings/:guildId/latest`)，默认展示所有榜单类型的最新数据。
- 增加日期选择器，当选择日期后，可以通过调用 `GET /api/rankings/:guildId/:type?seconds=X`（通过计算当前时间到选中日期的秒数差或者直接在后端过滤，目前后端已有 `/rankings/:guildId/:type?seconds=N` 接口支持获取历史数据。为了更方便地按日期获取所有类型的最新数据，可能需要前端循环调用或者在展示时在前端过滤缓存数据。鉴于后端 API，我们可以先获取指定日期内的数据并在前端提取每个类型的最后一条）。

## Impact
- Affected specs: 增加力量榜展示能力，扩展工会配置。
- Affected code:
  - `apps/web/src/pages/guild-dashboard/GuildDashboardPage.tsx`
  - `apps/web/src/pages/guild-dashboard/components/GuildTabs.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/SettingsTab.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/MightRankingsTab.tsx` (new)
  - `apps/api/src/modules/guilds/schema.ts` (if needed for settings typing, though settings is JSON)
  - `apps/web/src/i18n/zh.json` & `en.json`

## ADDED Requirements
### Requirement: 绑定采集工会 ID
The system SHALL allow guild admins to bind a specific "Data Collection Guild ID" in the Guild Settings.

#### Scenario: Success case
- **WHEN** user inputs an ID in Settings and clicks Save
- **THEN** the ID is saved to the guild's settings JSON.

### Requirement: 力量榜数据展示与日期筛选
The system SHALL display the might rankings for the bound guild ID and allow filtering by a specific date.

#### Scenario: Success case
- **WHEN** user visits the Might Rankings tab
- **THEN** the latest rankings data for all categories is fetched and displayed.
- **WHEN** user selects a past date
- **THEN** the rankings data is updated to show the most recent data recorded on or before that date.
