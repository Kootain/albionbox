# Add Reaction Analysis Feature Spec

## Why
目前 `KooKMessageBrowserPage.tsx` 中已经添加了 `countEmoji` 函数用于统计消息列表中的 Emoji 回复和表情数据，但尚未在界面中展现。需要提供一个可视化的面板来分析和展示这些统计数据。

## What Changes
- 在页面中增加一个新的面板模块“表情回复分析”。
- 增加一个“开始分析”按钮，点击后调用 `countEmoji(messages)` 获取统计结果，并保存在组件的 `State` 中。
- 将统计结果以可视化的方式展示出来，按用户（Nickname）分组，列出他们收到/产生的各种 Emoji 以及对应的数量。

## Impact
- Affected specs: 增强消息浏览工具的数据分析能力。
- Affected code: `apps/web/src/pages/test/KooKMessageBrowserPage.tsx`

## ADDED Requirements
### Requirement: Emoji Reaction Analysis
The system SHALL provide a feature to analyze and display the emoji reactions from the loaded messages.

#### Scenario: Success case
- **WHEN** user clicks "开始分析" in the Reaction Analysis panel
- **THEN** the system runs `countEmoji(messages)` to gather stats.
- **THEN** the UI displays the counts of emojis grouped by user nickname.