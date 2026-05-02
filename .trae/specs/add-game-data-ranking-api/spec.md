# Add Game Data Ranking API Spec

## Why
我们需要提供一个 API 模块来保存和查询游戏内的各种数据榜单（Ranking）。第一期目标是支持“工会赛季个人力量贡献”排行榜，支持不同类型的榜单数据采集，供外部系统写入以及业务系统读取。

## What Changes
- 在 `@albionbox/db` 新增 `guild_rankings` 表。
  - `id` UUID
  - `guild_id` 字符串（非外键）
  - `ranking_type` 字符串（例如 "CASTLE", "CORRUPTED" 等）
  - `collected_at` ISO时间戳字符串，记录榜单采集时间
  - `data` JSON 字符串，存储具体的排名数据 `[{"Username": score}, ...]`
  - `created_at` ISO时间戳字符串
- 在 `@albionbox/shared` 新增 Schema，支持以下类型：
  - "CASTLE", "CORRUPTED", "ENERGYCRYSTAL", "GATHERING", "GVGSEASON", "HELLDUNGEON", "HELLGATE", "POWERCORE", "PVE", "SMUGGLERS", "SPIDERS", "TREASURES"
- 在 `apps/api` 增加 `game_data` 或 `rankings` 模块的 Router。
  - **POST** `/:guildId/rankings` (由 api-token 鉴权，支持插入/更新榜单)
  - **GET** `/:guildId/rankings/latest` 获取该工会所有类型榜单的最新数据。
  - **GET** `/:guildId/rankings/:type` 根据榜单类型按时间获取最近 N 秒内的数据（或者直接按采集时间降序返回指定数量的数据）。

## Impact
- Affected specs: 增加新的排行榜数据写入与读取能力。
- Affected code:
  - `packages/db/src/schema/rankings.ts` (new)
  - `packages/db/src/schema/index.ts`
  - `packages/shared/src/schemas/rankings.ts` (new)
  - `packages/shared/src/index.ts`
  - `apps/api/src/modules/rankings/router.ts` (new)
  - `apps/api/src/index.ts`

## ADDED Requirements
### Requirement: 写入排行榜数据
The system SHALL provide an API to write ranking data authenticated via API Token.

#### Scenario: Success case
- **WHEN** user posts ranking JSON data with a valid api-token
- **THEN** data is inserted into `guild_rankings` table successfully

### Requirement: 读取最新排行榜
The system SHALL provide an API to read the latest rankings for a guild across all types.

#### Scenario: Success case
- **WHEN** user requests `/rankings/latest` for a specific guild
- **THEN** the system returns a list containing the most recent record for each `ranking_type`.

### Requirement: 按类型读取最近的排行榜
The system SHALL provide an API to read recent rankings of a specific type.

#### Scenario: Success case
- **WHEN** user requests `/rankings/:type?seconds=N`
- **THEN** the system returns all records of that type collected within the last N seconds (or just limits by default).
