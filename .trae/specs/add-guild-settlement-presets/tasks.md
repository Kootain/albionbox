# Tasks
- [x] Task 1: 数据层扩展（guild_settings 增加 settlementPreset）
  - [x] SubTask 1.1: 在 `packages/db/src/schema/guilds.ts` 的 `guildSettings` 增加 `settlementPreset` JSON 字段
  - [x] SubTask 1.2: 增加 migration（默认允许 null）

- [x] Task 2: Shared Schema 扩展（UpdateGuildSettingsSchema + preset schema）
  - [x] SubTask 2.1: 在 `packages/shared/src/schemas/settlements.ts` 抽取/新增 `SettlementPresetSchema`（不含 imports）
  - [x] SubTask 2.2: 在 `packages/shared/src/schemas/guild.ts` 的 `UpdateGuildSettingsSchema` 增加 `settlementPreset?: SettlementPreset | null`

- [x] Task 3: 后端读写适配（guild_settings.router）
  - [x] SubTask 3.1: `GET /guilds/:id/settings` 返回 `settlementPreset`（无记录时默认 null）
  - [x] SubTask 3.2: `PUT /guilds/:id/settings` 支持 upsert `settlementPreset`

- [x] Task 4: 工会配置页新增 preset 编辑区
  - [x] SubTask 4.1: 在 SettingsTab 增加“结算默认配置”卡片，包含四块配置（力量奖励/力量TOP/能量核心/力量水晶）
  - [x] SubTask 4.2: 读取 settings 回填 preset，保存时写回 settings

- [x] Task 5: 创建结算周期面板默认读取 preset
  - [x] SubTask 5.1: 打开创建结算模态框时拉取 guild settings
  - [x] SubTask 5.2: 若存在 preset，则用它初始化表单 state（不改 CSV 导入表）

- [x] Task 6: 验证与回归
  - [x] SubTask 6.1: `apps/api`、`apps/web` TypeScript 检查通过
  - [x] SubTask 6.2: 手工验证：保存 preset → 创建结算面板自动回填 → 创建请求携带回填值

# Task Dependencies
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 1-5
