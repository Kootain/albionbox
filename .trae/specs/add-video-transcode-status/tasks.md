# Tasks

- [x] Task 1: Update Database Schema
  - [x] SubTask 1.1: 在 `packages/db/src/schema/replay.ts` 的 `replayVideos` 表中添加 `transcodeStatus` 字段 (JSON 格式，类型 `text('transcode_status', { mode: 'json' })`)。
  - [x] SubTask 1.2: 使用 drizzle-kit 生成迁移文件并应用数据库迁移。

- [x] Task 2: Implement Volcengine Webhook Callback
  - [x] SubTask 2.1: 在 `apps/api/src/modules/replay/volcengine.ts` 中更新 `getPlayInfo` 函数，使其能返回所有清晰度与对应 URL 的映射对象（例如 `{ "720p": "url", "360p": "url" }`），而不仅仅是第一个 URL。
  - [x] SubTask 2.2: 在 `apps/api/src/modules/replay/router.ts` 中新增开放的 POST `/volcengine-webhook` 路由。
  - [x] SubTask 2.3: 在该 webhook 处理函数中解析 `EventType === 'WorkflowComplete'`，获取 `Data.Vid`。
  - [x] SubTask 2.4: 针对该 `Vid` 调用更新后的 `getPlayInfo`，获取解析出的多码率 URL 映射对象，并将其更新至对应视频记录的 `transcodeStatus` 字段。

- [x] Task 3: Update Video API to Return Multi-bitrate URLs
  - [x] SubTask 3.1: 在 `apps/api/src/modules/replay/router.ts` 的 `getVideosHandler` 中，确保返回的每个视频对象中包含并暴露解析后的多码率 URL 数据 (`transcodeStatus`)。如果存在多码率缓存，则优先使用或返回该缓存字段，替代单次的 API 查询。
  - [x] SubTask 3.2: 更新 `packages/shared/src/schemas/replay.ts` 和 `apps/replay/src/types/index.ts` 中的 `VideoRecord` 接口，增加 `transcodeStatus: Record<string, string>` 类型的定义。

- [x] Task 4: Frontend UI Updates for Transcode Status
  - [x] SubTask 4.1: 在 `apps/replay/src/components/modals/PlayerModal.tsx` 中，根据 `video.transcodeStatus` 字段是否存在且包含多码率 URL，判断当前视频的转码状态。
  - [x] SubTask 4.2: 如果没有获取到任何码率 URL，则在原先渲染 `VolcPlayer` 的位置显示“转码中...”的占位 UI。
  - [x] SubTask 4.3: 如果存在多码率 URL，则正常渲染视频，并在播放区域的右下角展示其支持的码率（如 720p, 360p）的文本标签。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
