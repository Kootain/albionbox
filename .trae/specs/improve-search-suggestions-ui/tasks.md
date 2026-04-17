# Tasks

- [x] Task 1: 设计并实现自定义 Suggestion 下拉组件
  - [x] 参考 `GuildsPage.tsx` 的下拉样式，抽取一个可复用的 `SuggestionInput`（或在 RegearApprovalTab 内局部实现）
  - [x] 支持 maxItems（默认 8）与下拉层 maxHeight + overflow-y-auto
  - [x] 支持点击外部关闭、Esc 关闭、点击选项回填

- [x] Task 2: 在补装审批页替换 datalist 方案
  - [x] 替换频道筛选输入框：使用 channelsMap 本地过滤并显示建议
  - [x] 替换申请人筛选输入框：使用 usersMap 本地过滤并显示建议
  - [x] 确保选中建议后仍能正确向后端查询（需要把 name 反查为 id 的逻辑保留）

- [x] Task 3: 验证与回归
  - [x] `apps/web` 下运行 `npx tsc --noEmit`
  - [x] 手动检查：输入框不会一次性展开过多条目，下拉可滚动，点击外部/ESC 可关闭

# Task Dependencies
- Task 2 depends on Task 1
