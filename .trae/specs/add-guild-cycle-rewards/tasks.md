# Tasks
- [ ] Task 1: 新增结算数据表与迁移
  - [ ] SubTask 1.1: 在 `packages/db/src/schema` 新增 SettlementCycle/SettlementDetail 的 drizzle schema
  - [ ] SubTask 1.2: 新增 migration 创建两张表与必要索引（`guild_id`, `settlement_id`, `reward_type`, `sub_type`, `is_paid`）
  - [ ] SubTask 1.3: 更新 `packages/db/src/schema/index.ts` 导出

- [ ] Task 2: 新增 shared schema/DTO
  - [ ] SubTask 2.1: 在 `packages/shared/src/schemas` 新增创建结算周期的输入 schema（包含 config 与导入表数据）
  - [ ] SubTask 2.2: 新增 API 响应/聚合视图的类型定义

- [ ] Task 3: 实现后端结算模块（API + 生成器）
  - [ ] SubTask 3.1: 新增 `apps/api/src/modules/settlements` 模块与路由挂载
  - [ ] SubTask 3.2: 实现创建结算周期接口：解析配置、解析导入数据（CSV）、解析并锁定 `guild_rankings` 快照 ID
  - [ ] SubTask 3.3: 实现三种 generator（MIGHT_REWARD / MIGHT_TOP_REWARD / RESOURCE_REWARD）并输出 SettlementDetail 列表
  - [ ] SubTask 3.4: 实现查询接口：周期列表、周期详情（至少包含按玩家聚合所需数据）
  - [ ] SubTask 3.5: 实现按玩家聚合行的发放状态切换接口（paid/unpaid）
  - [ ] SubTask 3.6: 权限控制：仅 `guild:manage` 可创建与切换发放状态；`guild:view` 可查看

- [ ] Task 4: 实现前端结算入口与创建流程
  - [ ] SubTask 4.1: 在工会大盘增加入口（Tab 或 Settings 内入口）并加 i18n 文案
  - [ ] SubTask 4.2: 结算周期创建模态框：配置 might/mightTop/resource 规则 + 两个导入表格上传
  - [ ] SubTask 4.3: 调用后端创建接口，展示创建结果与跳转到结算详情页

- [ ] Task 5: 实现前端结算结果展示（两种视图）
  - [ ] SubTask 5.1: 默认“按玩家聚合”表格：动态列（奖励类型+子类型）、合计列、统一单位格式化（k/m，两位小数）
  - [ ] SubTask 5.2: 发放状态列交互：发放/撤回（✅）并与后端接口联动
  - [ ] SubTask 5.3: 第二视图：按明细列表展示（用于核对）

- [ ] Task 6: 测试与验收
  - [ ] SubTask 6.1: 为 generator 添加单元测试（至少覆盖：阈值、Top 奖励、资源奖励合计）
  - [ ] SubTask 6.2: API 路由基本测试或最小手工校验脚本（不依赖外部采集）
  - [ ] SubTask 6.3: 前端关键交互自测：创建周期、查看聚合表、发放/撤回

# Task Dependencies
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 3, Task 4, Task 5
