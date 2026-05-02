# Tasks
- [x] Task 1: 增加创建工单状态管理 (`RegearTab.tsx`)
  - [x] SubTask 1.1: 在 `RegearTab.tsx` 中定义 `isCreatingOrder` 状态，初始值为 `false`。
  - [x] SubTask 1.2: 修改 `handleCreateOrderFromPreview` 函数，在执行请求前将 `isCreatingOrder` 设置为 `true`，在 `finally` 中设置为 `false`。
- [x] Task 2: 传递状态并禁用按钮 (`RegearDetail.tsx`)
  - [x] SubTask 2.1: 在 `RegearDetail.tsx` 的 `RegearDetailProps` 中新增可选的 boolean 属性 `isCreating`。
  - [x] SubTask 2.2: 在 `RegearTab.tsx` 渲染 `<RegearDetail>` 组件时，将 `isCreatingOrder` 作为 `isCreating` 的值传入。
  - [x] SubTask 2.3: 在 `RegearDetail.tsx` 中，找到 "Create Ticket" 按钮，当 `isCreating` 为 true 时添加 `disabled` 属性，并且可加入一个 `Loader2`（来自 `lucide-react`）旋转图标，以展示正在创建的状态。

# Task Dependencies
- [Task 2] depends on [Task 1]