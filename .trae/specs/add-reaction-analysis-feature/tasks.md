# Tasks
- [x] Task 1: Add UI State for Reaction Analysis
  - [x] SubTask 1.1: 在 `KooKMessageBrowserPage.tsx` 中增加 `reactionStats` 的 `useState`，类型为 `Record<string, Record<string, number>> | null`。
  - [x] SubTask 1.2: 增加一个处理函数 `handleAnalyzeReactions`，调用 `countEmoji(messages)` 并更新 state。
  - [x] SubTask 1.3: 在加载频道和重新获取消息时，清空 `reactionStats`。

- [x] Task 2: Create Reaction Analysis Panel
  - [x] SubTask 2.1: 在页面中增加一个“表情回复分析”面板（与批量模拟、图片查重等同级）。
  - [x] SubTask 2.2: 在面板中加入一个按钮，点击时触发 `handleAnalyzeReactions`。
  - [x] SubTask 2.3: 渲染 `reactionStats` 的数据。遍历每个用户（nickname），在其下方列出所有的表情及其被回复的次数（可使用 Badge / Chip 样式）。