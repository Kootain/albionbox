# Tasks

- [x] Task 1: 数据库 Schema 定义
  - [x] SubTask 1.1: 创建 `/packages/db/src/schema/replay.ts` 文件，使用 Drizzle ORM 定义 `replayVideos`, `replayHighlights`, `replayComments` 三张表及外键关系。
  - [x] SubTask 1.2: 在 `/packages/db/src/schema/index.ts` 中导出 `replay.ts` 中的所有表模型。

- [x] Task 2: 共享 DTO 与验证 Schema 定义
  - [x] SubTask 2.1: 创建 `/packages/shared/src/schemas/replay.ts`，定义对应的 Zod schema，如 `CreateReplayVideoSchema`, `CreateReplayHighlightSchema`, `CreateReplayCommentSchema` 等。
  - [x] SubTask 2.2: 在 `/packages/shared/src/schemas/index.ts` 和 `/packages/shared/src/index.ts` 中导出新增的 schemas。

- [x] Task 3: API 模块实现
  - [x] SubTask 3.1: 创建 `/apps/api/src/modules/replay/router.ts` 和 `index.ts`。
  - [x] SubTask 3.2: 实现 `POST /` (创建视频)、`GET /` (获取视频列表及嵌套高亮评论，支持日期筛选)。
  - [x] SubTask 3.3: 实现 `PUT /:id/sync` (绑定绝对时间)。
  - [x] SubTask 3.4: 实现 `POST /:id/highlights` (创建高亮)。
  - [x] SubTask 3.5: 实现 `POST /highlights/:highlightId/comments` (创建评论)。
  - [x] SubTask 3.6: 实现 `DELETE /:id` (删除视频，级联删除高亮和评论)。

- [x] Task 4: 路由注册与测试检查
  - [x] SubTask 4.1: 在 `/apps/api/src/index.ts` 中注册 `replayRouter` (例如挂载在 `/replay` 路径下)。
  - [x] SubTask 4.2: 在 `/packages/db` 中运行 `npm run db:generate` 生成数据库迁移文件 (Migration)（可选，但需确保 TypeScript 类型正常无误）。
  - [x] SubTask 4.3: 运行 `cd apps/api && npm run lint` (`tsc --noEmit`) 验证所有类型和导入。

# Task Dependencies
- Task 2 依赖于 Task 1 明确数据结构。
- Task 3 依赖于 Task 1 和 Task 2。
- Task 4 依赖于 Task 3 路由编写完毕。