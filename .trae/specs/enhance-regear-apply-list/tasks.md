# Tasks
- [x] Task 1: 抽取补装申请行组件 (`RegearApplyRow`)
  - [x] SubTask 1.1: 创建 `apps/web/src/pages/guild-dashboard/tabs/regear-components/RegearApplyRow.tsx` 文件，定义好组件 `Props`。
  - [x] SubTask 1.2: 将 `RegearApprovalTab.tsx` 中原有的单行申请渲染代码迁移至 `RegearApplyRow` 组件内，并提供格式化时间、获取状态徽章、处理详情弹窗、删除操作的回调函数。
  - [x] SubTask 1.3: 修改 `RegearApprovalTab.tsx` 原分组视图中的 `b.applies.map`，使用新的 `RegearApplyRow` 组件进行渲染。
- [x] Task 2: 添加“按战斗分组”开关逻辑
  - [x] SubTask 2.1: 在 `RegearApprovalTab.tsx` 中增加一个 state `groupByBattle`，初始值为 `true`。
  - [x] SubTask 2.2: 在页面的过滤条件区域（如头部按钮旁或筛选条件旁）添加一个 Switch / Checkbox 开关组件，用于控制 `groupByBattle` 的状态。
  - [x] SubTask 2.3: 增加多语言文案：为开关添加类似“按战斗分组”/“Group by Battle”的多语言翻译。
- [x] Task 3: 实现平铺视图逻辑 (Flat View)
  - [x] SubTask 3.1: 编写 `flatApplies` 计算属性（通过 `useMemo`），当 `groupByBattle` 为 `false` 时，将当前过滤后的 `sortedBattles` 中的所有申请展开为一维数组。
  - [x] SubTask 3.2: 对 `flatApplies` 数组按照 `createTime` 进行降序排序（大时间在前）。
  - [x] SubTask 3.3: 在渲染区域增加条件判断：当 `groupByBattle` 为 `true` 时渲染现有的按战斗分组 UI；为 `false` 时直接遍历渲染 `flatApplies` 的列表（均使用 `RegearApplyRow`）。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]