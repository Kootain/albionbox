# KOOK 用户绑定游戏角色 Spec

## Why
在 `test/kook-messages` 页面中，我们需要把 KOOK 平台的用户（kookId）与系统内的 Albion 游戏角色（game_accounts）建立绑定关系，便于后续统计、奖励发放与跨系统协作。

## What Changes
- 新增“KOOK 用户绑定游戏角色”模块（仅在 `test/kook-messages` 页面内展示）：
  - 统计当前加载消息中出现过的 KOOK 用户。
  - 支持选择系统内工会（绑定关系限定在工会内）。
  - 展示每个 KOOK 用户在该工会内的绑定状态；未绑定提供“绑定”按钮。
  - 绑定操作弹出 Albion 角色搜索框并完成绑定。
- 后端新增“第三方平台身份 ↔ 工会成员(游戏角色)”绑定接口。
- 数据模型调整：
  - 复用 `game_accounts` 存储被选择的 Albion 角色信息（可不关联 userId）。
  - 扩展 `guild_members` 增加平台身份字段：`provider/providerId/providerName`。
  - `guild_members.chest_x/chest_y` 视为废弃字段，本变更不再使用它们。

## Impact
- Affected specs: test/kook-messages 的分析与奖励辅助能力；工会成员身份模型扩展。
- Affected code:
  - `packages/db/src/schema/guilds.ts`（扩展 guild_members）
  - `packages/db/migrations/*`（新增迁移）
  - `packages/shared/src/schemas/*`（新增绑定接口 DTO）
  - `apps/api/src/modules/guilds/guild_members.router.ts`（新增绑定接口）
  - `apps/web/src/pages/test/KookMessageBrowserPage.tsx`（新增绑定模块 UI）
  - `apps/web/src/pages/guild-dashboard/tabs/SettingsTab.tsx`（抽取复用的 Albion 角色搜索组件）

## ADDED Requirements
### Requirement: guild_members 扩展平台身份字段
The system SHALL store third-party platform identity on `guild_members`.

#### Data: guild_members (新增字段)
- `provider`: string | null（枚举：`kook` / `discord`）
- `providerId`: string | null（kook 用户 id / discord 用户 id）
- `providerName`: string | null（平台展示名：nickname/username）

#### Constraints
- 系统 SHALL 保持 `guild_members.user_id` 可为空（本功能不写入 user_id）。
- 系统 SHALL 允许仅通过 `game_account_id` 作为成员身份（满足现有 check：`user_id IS NOT NULL OR game_account_id IS NOT NULL`）。
- 系统 SHOULD 增加唯一约束，避免重复绑定：
  - `(guild_id, provider, provider_id)` 唯一
  - `(guild_id, game_account_id)` 唯一

### Requirement: 查询工会内平台绑定
The system SHALL provide an API to list bindings for a guild and provider.

#### Endpoint
- `GET /guilds/:id/provider_bindings?provider=kook|discord`

#### Response (logical)
- `items: Array<{ guildMemberId, provider, providerId, providerName, gameAccountId, gameAccountUsername, albionPlayerId }>`

#### Scenario: Success case
- **WHEN** 用户选择一个工会并进入绑定模块
- **THEN** 前端可拉取该工会现有的 provider 绑定列表并进行展示

### Requirement: 绑定 KOOK 用户到游戏角色（工会内）
The system SHALL allow guild managers to bind a provider user to a game account within a guild.

#### Endpoint
- `PUT /guilds/:id/provider_bindings`

#### Request (logical)
- `provider`: `kook` | `discord`
- `providerId`: string
- `providerName`: string (optional)
- `gameAccount`:
  - `username`: string（Albion 角色名）
  - `albionPlayerId`: string（Albion 玩家 ID）

#### Behavior
- 系统 SHALL upsert `game_accounts`：
  - 以 `(username, server)`（server 从 guild.server 推导）作为唯一性
  - `user_id` 为空
  - `status` 设为 `verified`（用于复用既有结构；不触发用户侧绑定流程）
- 系统 SHALL upsert `guild_members`：
  - 按 `(guild_id, provider, provider_id)` 找到则更新其 `game_account_id/provider_name`
  - 不存在则创建新记录（写入 `joined_at`）
- 系统 SHALL 校验 `game_accounts.server` 与 `guild.server` 一致，否则 400。

#### Permissions
- `guild:view`：可查询绑定
- `guild:manage`：可绑定（写入/更新）

#### Scenario: Success case
- **WHEN** 管理员在 test/kook-messages 里对某个 KOOK 用户选择 Albion 角色并确认绑定
- **THEN** 该用户在所选工会下显示已绑定，并展示对应 `game_accounts.username/albionPlayerId`

### Requirement: test/kook-messages 绑定模块 UI
The system SHALL provide a binding UI in `test/kook-messages`.

#### UI Elements
- 工会选择下拉框：数据来自 `GET /guilds`（当前用户可见工会列表）
- 用户列表：从当前加载消息中提取的去重 KOOK 用户集合
- 每行展示：
  - `providerId`（kookId）
  - `providerName`（nickname/username，若可得）
  - 绑定的 `gameAccount.username` 与 `albionPlayerId`（若已绑定）
  - 未绑定显示“绑定”按钮；已绑定可显示“更换绑定”按钮（复用同一流程）
- 绑定弹窗：
  - 搜索框支持按名字搜索 Albion 玩家（复用“工会配置页宝箱配置”的搜索交互）
  - 搜索结果点击即选择
  - 确认后调用 `PUT /guilds/:id/provider_bindings`

### Requirement: 复用 Albion 玩家搜索组件
The system SHALL extract a reusable Albion player search component.

#### Scope
- 把 `SettingsTab` 中宝箱配置的搜索区域抽成独立组件（例如 `AlbionPlayerSearch`），供：
  - 宝箱配置继续使用
  - test/kook-messages 绑定弹窗复用

## MODIFIED Requirements
### Requirement: guild_members 宝箱坐标
现有 `guild_members.chest_x/chest_y` 在该功能中不再使用。

## REMOVED Requirements
### Requirement: 无
**Reason**: 不涉及移除既有接口或功能。
**Migration**: 无。

