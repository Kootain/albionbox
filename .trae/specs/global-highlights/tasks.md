# Tasks

- [ ] Task 1: 后端接口开发
  - [ ] SubTask 1.1: 在 `apps/api/src/modules/replay/router.ts` 增加 `GET /highlights/global` 路由。
  - [ ] SubTask 1.2: 接收 `startTime` 和 `endTime` 参数（查询字符串）。
  - [ ] SubTask 1.3: 查询 `replayHighlights` 中 `absoluteTime` 在此区间内的记录。
  - [ ] SubTask 1.4: 联表查询或拼接获取对应的 `comments` 以及该高亮所属的 `replayVideos`（提取 username 以便前端展示）。

- [ ] Task 2: 前端 API 封装
  - [ ] SubTask 2.1: 在 `apps/replay/src/lib/api.ts` 增加 `getGlobalHighlights` 调用。

- [ ] Task 3: 播放器状态接入
  - [ ] SubTask 3.1: 在 `PlayerModal.tsx` 增加 `globalHighlights` 状态。
  - [ ] SubTask 3.2: 编写 `useEffect`，当 `mainVideo.absoluteStartTime` 或 `duration` 变化且有效时，发起 `getGlobalHighlights` 请求。
  - [ ] SubTask 3.3: 过滤掉 `globalHighlights` 中属于当前 `mainVideo.id` 的记录（避免重复）。

- [ ] Task 4: 时间轴样式与渲染优化
  - [ ] SubTask 4.1: 修改时间轴上高亮的渲染。整合 `mainVideo.highlights` 与过滤后的 `globalHighlights`。
  - [ ] SubTask 4.2: 对于全局高亮，计算其相对当前视频的 `timestamp`：`(hl.absoluteTime - mainVideo.absoluteStartTime) / 1000`。
  - [ ] SubTask 4.3: 优化高亮 UI 样式：改用圆形/水滴形，本视频使用主色调（如 system-accent），其他视频使用不同的颜色（如 `#3b82f6` 蓝色）。
  - [ ] SubTask 4.4: 悬浮 `globalHighlights` 的 popover 顶部增加来源标识（如 `[From: Username]`）。

- [ ] Task 5: 验证类型安全
  - [ ] SubTask 5.1: 运行 `tsc --noEmit` 保证通过。

# Task Dependencies
- Task 2 依赖 Task 1。
- Task 3, 4 依赖 Task 2。