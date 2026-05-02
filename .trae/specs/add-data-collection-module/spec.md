# Add Data Collection Module Spec

## Why
需要一个前端界面来进行游戏数据的采集，特别是“工会赛季个人力量贡献”排行榜数据。通过连接到本地 WebSocket (AlbionGo)，收集游戏内事件并在前端展示和合并数据，最后通过接口上传到服务端。

## What Changes
- 在 `/apps/web` 新增 `Data Collection` (数据采集) 页面和路由。
- 在 `AppShell.tsx` 中添加“数据采集”侧边栏导航入口。
- 实现 WebSocket 客户端逻辑，连接到 `ws://127.0.0.1:8081/events`。
- 监听并处理 `Type: 2`, `Code: 445` (`OpGetPvpChallengeData`) 事件，提取 `GuildID`, `ChallengeType`, `Usernames`, `Mights`。
- 在前端维护按 `ChallengeType` 分类的玩家力量榜单数据，并实时渲染展示。
- 增加“完成上传”按钮，点击后将合并好的榜单数据按照接口要求 (`POST /api/rankings/:guildId/rankings`) 提交到后端。

## Impact
- Affected specs: 增加数据采集前端模块。
- Affected code:
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/AppShell.tsx`
  - `apps/web/src/pages/data-collection/DataCollectionPage.tsx` (new)
  - `apps/web/src/i18n/zh.json` & `en.json`

## ADDED Requirements
### Requirement: 侧边栏导航
The system SHALL provide a sidebar link to access the Data Collection page.

### Requirement: WebSocket 连接与数据合并
The system SHALL connect to the local WebSocket server to receive game events and merge ranking data (Type=2, Code=445) in real-time.

#### Scenario: Success case
- **WHEN** the player turns pages in the game and receives event `445`
- **THEN** the frontend extracts `Usernames` and `Mights` and merges them into the current state by `ChallengeType`.

### Requirement: 数据上传
The system SHALL allow users to upload the collected data to the backend.

#### Scenario: Success case
- **WHEN** user clicks "Finish/Upload"
- **THEN** the frontend sends a POST request to `/rankings/:guildId/rankings` with the formatted ranking data.
