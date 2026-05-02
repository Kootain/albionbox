# Tasks
- [x] Task 1: 扩展数据库表结构（guild_members）
  - [x] SubTask 1.1: 在 `packages/db/src/schema/guilds.ts` 为 `guild_members` 增加 `provider/providerId/providerName` 字段
  - [x] SubTask 1.2: 增加必要索引/唯一约束（`(guild_id, provider, provider_id)`，`(guild_id, game_account_id)`）
  - [x] SubTask 1.3: 生成并应用 D1 migration（本地 migrate:local）

- [x] Task 2: 新增 shared schemas（provider 绑定）
  - [x] SubTask 2.1: 新增 `ListProviderBindings` / `UpsertProviderBinding` 的 zod schema 与类型导出

- [x] Task 3: 后端实现绑定 API
  - [x] SubTask 3.1: 在 `guild_members.router.ts` 增加 `GET /guilds/:id/provider_bindings`
  - [x] SubTask 3.2: 增加 `PUT /guilds/:id/provider_bindings`（upsert game_accounts + upsert guild_members）
  - [x] SubTask 3.3: 权限校验：view/manage
  - [x] SubTask 3.4: 校验 guild.server 与 game_accounts.server 一致

- [x] Task 4: 抽取并复用 Albion 搜索组件
  - [x] SubTask 4.1: 从 `SettingsTab` 抽取搜索框+结果列表为可复用组件
  - [x] SubTask 4.2: 保持宝箱配置功能行为不变

- [x] Task 5: test/kook-messages 增加绑定模块 UI
  - [x] SubTask 5.1: 增加工会下拉框（调用 `GET /guilds`）
  - [x] SubTask 5.2: 从当前加载消息中统计 KOOK 用户（kookId + nickname/username）
  - [x] SubTask 5.3: 拉取 provider_bindings 并展示绑定状态
  - [x] SubTask 5.4: 未绑定/更换绑定：弹窗选择 Albion 玩家并调用绑定接口

- [ ] Task 6: 校验与回归
  - [x] SubTask 6.1: `apps/api` 与 `apps/web` TypeScript 检查通过
  - [ ] SubTask 6.2: 关键路径手工自测：选择工会 → 看到用户列表 → 绑定 → 刷新后仍展示绑定

# Task Dependencies
- Task 3 depends on Task 1, Task 2
- Task 4 can be done in parallel with Task 1-3
- Task 5 depends on Task 3, Task 4
- Task 6 depends on Task 1-5
