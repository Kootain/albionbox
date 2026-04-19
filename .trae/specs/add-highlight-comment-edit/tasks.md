# Tasks

- [x] Task 1: 共享 Schema 补充
  - [x] SubTask 1.1: 在 `packages/shared/src/schemas/replay.ts` 中添加 `UpdateReplayCommentSchema` (仅包含 `content`)。
  - [x] SubTask 1.2: 添加 `UpdateReplayHighlightSchema` (包含 `timestamp` 和 `absoluteTime`)。

- [x] Task 2: 后端 API 实现
  - [x] SubTask 2.1: 在 `apps/api/src/modules/replay/router.ts` 中实现 `DELETE /highlights/:id`，删除前校验并处理可能的级联删除。
  - [x] SubTask 2.2: 实现 `PUT /highlights/:id`，更新高亮时间点。
  - [x] SubTask 2.3: 实现 `DELETE /comments/:id`。
  - [x] SubTask 2.4: 实现 `PUT /comments/:id`，更新评论文本。

- [x] Task 3: 前端接口层封装
  - [x] SubTask 3.1: 在 `apps/replay/src/lib/api.ts` 中增加 `deleteHighlight`, `updateHighlight`, `deleteComment`, `updateComment` 方法并对接 Hono client。

- [x] Task 4: 前端 UI 改造 (`PlayerModal.tsx`)
  - [x] SubTask 4.1: 为每一条评论增加一个操作区（当 `comment.username === boundAccount` 时展示 Edit / Delete 按钮）。
  - [x] SubTask 4.2: 实现评论删除交互（弹出确认框，成功后将对应的 comment 从 React 状态里移除）。
  - [x] SubTask 4.3: 实现评论编辑交互（点击 Edit 将内容变为一个 textarea，点击保存提交 API，成功后更新状态）。
  - [x] SubTask 4.4: 在高亮面板头部增加高亮的删除按钮（当高亮的第一个评论的作者为当前用户时允许删除），成功后移除整个高亮及评论。

- [x] Task 5: 验证类型安全
  - [x] SubTask 5.1: 分别在 `apps/api` 和 `apps/replay` 运行 `tsc --noEmit` 保证全链路类型校验通过。

# Task Dependencies
- Task 2 依赖于 Task 1 补充的 Zod Schema。
- Task 3 依赖于 Task 2 完成后端路由注册，以便 Hono client 推导出泛型类型。
- Task 4 依赖于 Task 3 提供封装好的方法。