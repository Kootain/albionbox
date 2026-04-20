# Tasks

- [ ] Task 1: 完善 Preview 页面的 `RegearTab.tsx` 过滤逻辑
  - [ ] SubTask 1.1: 确认 `fetchEventsForBattle` 后的合并阶段，针对已经获取到的 `existingRegears` 列表，如果对应的 `eventId` 在 `existingRegears` 中存在，且其状态**不是** `excluded`，则从预览中剔除这条死亡记录（或者仅标记为已处理并不创建）。由于已经修改过此文件，需检查或完善 `Array.from(recordsMap.values()).filter` 的相关过滤逻辑。

- [ ] Task 2: 验证
  - [ ] SubTask 2.1: `apps/web` 编译无误。
  - [ ] SubTask 2.2: `apps/api` 检查其 `router.ts` 中针对 `ne(regears.status, 'excluded')` 的拦截逻辑已覆盖。

# Task Dependencies
- [Task 2] depends on [Task 1]