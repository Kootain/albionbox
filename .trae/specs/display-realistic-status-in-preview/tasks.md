# Tasks

- [ ] Task 1: 完善 Preview 页面的 `RegearTab.tsx` 过滤逻辑
  - [ ] SubTask 1.1: 恢复 `RegearTab.tsx` 中 `generatedRecords` 的逻辑，**不再**过滤掉 `status !== 'excluded'` 的已有记录，将所有同公会的记录都在预览中保留，并且把 `regearedSlots` 的数据同步赋值给 `recordsMap`，以便如果该记录已补装，则在预览中也能看到它。

- [ ] Task 2: 验证
  - [ ] SubTask 2.1: `apps/web` 编译无误。
  - [ ] SubTask 2.2: `apps/api` 检查其 `router.ts` 中针对 `ne(regears.status, 'excluded')` 的拦截逻辑是否依然完整覆盖（已确认不需要改动）。

# Task Dependencies
- [Task 2] depends on [Task 1]