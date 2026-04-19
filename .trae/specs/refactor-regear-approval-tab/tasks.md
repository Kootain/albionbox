# Tasks
- [x] Task 1: 移除多模块视图切换及废弃代码
  - [x] SubTask 1.1: 移除 `view` 状态及界面上的“申请列表/补装候选”切换按钮。
  - [x] SubTask 1.2: 移除页面中单纯为“补装候选”预留的渲染块和分支。
  - [x] SubTask 1.3: 移除底部的分页器组件（`page`, `total`, `totalPages` 状态）。

- [x] Task 2: 重构前端数据加载逻辑并聚合展示
  - [x] SubTask 2.1: 调整获取申请列表数据的逻辑，取消 `limit` / `offset` 分页，结合现有的筛选条件（状态、申请人等）一次性拉取。
  - [x] SubTask 2.2: 在前端接收到数据后，按照 `battleId` 进行聚合。可复用原 `loadSupplementCandidates` 内按 `battleId` 取 battle tag（如 MASS 标记）的逻辑。

- [x] Task 3: 重构列表渲染界面
  - [x] SubTask 3.1: 将原本的单个表格重构为按 `battleId` 分组的结构（如卡片或折叠面板）。
  - [x] SubTask 3.2: 每组上方渲染战役相关的元信息：战役时间、MASS 标签、战斗详情按钮、标记/取消 MASS 按钮等。
  - [x] SubTask 3.3: 在每组内部渲染属于该 battleId 的申请条目表格（或列表），保留详情查看、图片查看及删除按钮。

- [x] Task 4: 集成全局“生成补装工单”操作
  - [x] SubTask 4.1: 在页面顶部或筛选器旁增加“生成补装工单”的主按钮。
  - [x] SubTask 4.2: 点击该按钮时，复用原有的 `handleGenerateSupplementTicket` 逻辑，针对当前加载到的有效 `battleId` 集合生成工单，包含检测 MASS 标记的二次确认逻辑。

# Task Dependencies
- Task 2 depends on Task 1.
- Task 3 depends on Task 2.
- Task 4 depends on Task 3.
