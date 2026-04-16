# Tasks

- [x] Task 1: 后端确认并补齐战斗标签 API（battles 表）
  - [x] SubTask 1.1: 校验 `battles` 表 Drizzle schema 与迁移已包含 `types`、主键/索引符合 upsert 需求
  - [x] SubTask 1.2: 校验并补齐 `PUT /guilds/:id/battles/:battleId`：支持写入/更新/清空 `types`（BattleType[] -> bitmask）
  - [x] SubTask 1.3: 校验并补齐 `POST /guilds/:id/battles`：按 `server + ids[]` 查询并返回 `types: BattleType[]`

- [x] Task 2: Web 战报列表用“标签”列替换“类型”列
  - [x] SubTask 2.1: 修改战报列表表头与单元格渲染：移除“类型（聚合/单场）”展示逻辑，改为展示 battle 标签
  - [x] SubTask 2.2: 在拉取 battle 列表后，批量请求 `POST /guilds/:guildId/battles` 获取 tags，并合并到列表行数据
  - [x] SubTask 2.3: 增补 i18n：列标题“标签”，以及标签枚举展示文案（如 MASS/SMALL_SCALE）

- [x] Task 3: Web 支持点击标签编辑并保存
  - [x] SubTask 3.1: 增加标签编辑交互（使用仓库既有弹窗/抽屉/Popover 组件与样式约定）
  - [x] SubTask 3.2: 保存时调用 `PUT /guilds/:guildId/battles/:battleId`，并在成功后刷新/更新该行标签
  - [x] SubTask 3.3: 处理异常与并发：保存中禁用提交；失败时提示错误且不破坏现有列表数据

- [x] Task 4: 验证
  - [x] SubTask 4.1: API 相关 TypeScript 检查通过（使用仓库既有命令）
  - [x] SubTask 4.2: Web 构建通过（tsc + vite build 或仓库既有命令）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1] & [Task 2]
- [Task 4] depends on [Task 1-3]
