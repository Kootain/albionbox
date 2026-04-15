# Tasks
- [x] Task 1: 共享层新增“补装候选 apply 查询”接口 Schema
  - [x] SubTask 1.1: 在 `packages/shared/src/schemas/regear_apply.ts` 增加 Query Schema（包含 `msgGuild`、`startTime`，并将状态默认为 `pending_audit` 的语义写入接口说明/实现）
  - [x] SubTask 1.2: 增加 Response Schema（复用 `RegearApplySchema[]` 或定义明确的返回结构）
  - [x] SubTask 1.3: 对外导出新增 schema/type

- [x] Task 2: 后端实现“补装候选 apply 查询”接口
  - [x] SubTask 2.1: 在 `apps/api/src/modules/regear_apply/router.ts` 新增路由（例如 `GET /regear_applies/supplement-candidates`）
  - [x] SubTask 2.2: 仅返回 `status=pending_audit` 且“死亡时间（applyDetail.timestamp）> startTime”的 apply
  - [x] SubTask 2.3: 为无法解析时间戳的记录定义一致行为（默认不纳入候选，避免误入）
  - [x] SubTask 2.4: TypeScript 类型检查通过（沿用仓库既有命令）

- [x] Task 3: 前端补装申请页增加补装流程 UI 与数据流
  - [x] SubTask 3.1: 调整 `GuildDashboardPage.tsx`，向补装申请页传入 `guildId` 与 `onRegearPreview(battleIds)` 回调
  - [x] SubTask 3.2: 在 `RegearApprovalTab.tsx` 顶部增加“开始补装”按钮与开始时间选择弹窗
  - [x] SubTask 3.3: 开始后调用候选查询接口，按 `battleId` 聚合为战斗列表
  - [x] SubTask 3.4: 批量拉取 battle tag，并在列表中展示；实现“优先展示无 tag 且非 MASS”排序
  - [x] SubTask 3.5: 实现战斗详情按钮：弹出模态框并复用 `BattleDetail` 组件展示单场 battle
  - [x] SubTask 3.6: 实现“标记为 MASS/取消 MASS”：调用 battle tag upsert 接口并即时刷新 UI
  - [x] SubTask 3.7: 实现删除 apply：调用删除接口，更新战斗/候选集合
  - [x] SubTask 3.8: 实现“生成补装工单”：若存在非 MASS 战斗先弹窗确认；确认后调用既有 ticket preview 跳转逻辑

- [x] Task 4: 基础文案与状态处理
  - [x] SubTask 4.1: 补齐 i18n key（按钮、弹窗、空态、错误态、确认提示）
  - [x] SubTask 4.2: 加载态/禁用态一致（避免重复请求、避免重复提交）

- [x] Task 5: 验证
  - [x] SubTask 5.1: `apps/api` TypeScript 检查通过（使用仓库既有命令）
  - [x] SubTask 5.2: `apps/web` build 通过（tsc + vite build）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1-2]
- [Task 4] depends on [Task 3]（或并行实现，最后统一收口）
- [Task 5] depends on [Task 1-4]
