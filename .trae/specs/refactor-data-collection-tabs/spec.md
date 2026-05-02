# Refactor Data Collection Tabs Spec

## Why
数据采集页面未来会有多个不同的采集模块。我们需要一个子 tab 切换设计，以便在不同的模块之间切换，同时确保底层 WebSocket 连接在切换 tab 时依然保持连接并在后台持续采集所有模块的数据。此外，现有的“工会力量个人贡献榜”需要一个“清除数据”的按钮，方便用户重新开始采集。

## What Changes
- 将 `DataCollectionPage.tsx` 中现有的榜单渲染和上传 UI 抽离到新的组件 `GuildMightRankingTab.tsx` 中。
- 在 `DataCollectionPage.tsx` 中引入 Tab 导航栏 UI。目前默认仅包含一个 Tab “工会力量个人榜”。
- WebSocket 数据监听和状态 (`collectionData`) 依然保留在 `DataCollectionPage.tsx`，以保证所有模块无论在哪个 Tab 都在持续采集。
- 给 `GuildMightRankingTab.tsx` 增加一个“清除数据”按钮，点击后清空该模块的收集状态。
- 完善页面所有的中英文 i18n 翻译。

## Impact
- Affected specs: 增强数据采集页面的可扩展性，支持多模块同时采集。
- Affected code:
  - `apps/web/src/pages/data-collection/DataCollectionPage.tsx`
  - `apps/web/src/pages/data-collection/tabs/GuildMightRankingTab.tsx` (new)
  - `apps/web/src/i18n/zh.json`
  - `apps/web/src/i18n/en.json`

## ADDED Requirements
### Requirement: 数据采集多模块 Tab
The system SHALL provide a tabbed interface to switch between data collection modules while continuing to collect data in the background.

#### Scenario: Success case
- **WHEN** user connects to WebSocket
- **THEN** data is collected for all active modules globally.
- **WHEN** user switches tabs
- **THEN** the collected data is preserved and displayed for the active module.

### Requirement: 清除模块数据
The system SHALL provide a "Clear Data" button for the Guild Might Rankings module.

#### Scenario: Success case
- **WHEN** user clicks "Clear Data"
- **THEN** the collected data for Guild Might Rankings is reset to empty.
