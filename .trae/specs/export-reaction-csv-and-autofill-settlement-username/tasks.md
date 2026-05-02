# Tasks
- [x] Task 1: 表情回复分析模块支持导出 CSV
  - [x] SubTask 1.1: 在 `test/kook-messages` 的“表情回复分析与奖励计算”区域增加“导出 CSV”按钮
  - [x] SubTask 1.2: 基于当前分析结果生成 CSV（header 与列映射符合 spec）
  - [x] SubTask 1.3: 文件下载命名规则（建议：`reaction_rewards_<channelId>_<anchor|date>.csv`）

- [x] Task 2: 结算模块导入 CSV 后自动补全 username（kookId → username）
  - [x] SubTask 2.1: 在结算创建页 CSV 导入解析完成后，拉取 `GET /guilds/:guildId/provider_bindings?provider=kook`
  - [x] SubTask 2.2: 用绑定数据对导入行进行 username 补全（只补空值）
  - [x] SubTask 2.3: 确保补全后的数据被提交到创建结算请求中

- [x] Task 3: 验证与回归
  - [x] SubTask 3.1: `apps/web` lint 通过（tsc --noEmit）
  - [x] SubTask 3.2: 手工验证导出 CSV 可被结算模块导入且列对齐
  - [x] SubTask 3.3: 手工验证：导入只有 kookId 的 CSV 能自动补全 username

# Task Dependencies
- Task 2 depends on provider_bindings API 已存在（当前已实现）。
- Task 3 depends on Task 1-2。
