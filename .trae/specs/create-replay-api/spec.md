# Create Replay API Spec

## Why
当前 `/apps/replay-v2` 的上传与展示功能主要依赖前端和本地 DB（IndexedDB）存储。为了支持跨端数据同步、多用户共享录像、高亮评论互动等真实的多人协作场景，我们需要在后端（`/packages/db` 和 `/apps/api`）建立一套完善的 Replay 数据模型与相应的 API 接口，负责管理视频记录、高亮标记及评论等核心数据。

## What Changes
- **Database Schema**: 在 `/packages/db` 中增加 `replay` 相关的三张表：
  - `replay_videos`: 存储主键、火山视频 ID (`vid`)、时长 (`duration`)、`username`、`date`、`role` 以及绑定的绝对时间起点 (`absolute_start_time`)。
  - `replay_highlights`: 存储主键、关联的视频 ID (`video_id`)、相对视频时间 (`timestamp`) 和对齐后的绝对时间 (`absolute_time`)。
  - `replay_comments`: 存储主键、关联的高亮 ID (`highlight_id`)、`username` 和评论内容 (`content`)。
- **Shared Schemas**: 在 `/packages/shared` 中添加针对 `replay` 实体的 Zod 校验 Schema，如视频创建、高亮提交、评论提交等 DTO 模型。
- **API Module**: 在 `/apps/api/src/modules/replay` 中新建路由模块：
  - `POST /videos`: 创建视频记录。
  - `GET /videos`: 查询视频列表（支持日期、用户名等过滤）。
  - `PUT /videos/:id/sync`: 绑定/更新视频的绝对时间起点。
  - `POST /videos/:id/highlights`: 在视频中添加高亮时间点。
  - `POST /highlights/:id/comments`: 为高亮添加评论。
  - `DELETE /videos/:id`: 删除视频。
- **API Registry**: 将新建的 `replayRouter` 挂载到 `/apps/api/src/index.ts` 中的主应用实例。

## Impact
- Affected specs: 云端存储能力支持，是支持全端同步的核心。
- Affected code:
  - `/packages/db/src/schema/replay.ts`
  - `/packages/db/src/schema/index.ts`
  - `/packages/shared/src/schemas/replay.ts`
  - `/apps/api/src/modules/replay/router.ts`
  - `/apps/api/src/modules/replay/index.ts`
  - `/apps/api/src/index.ts`

## ADDED Requirements
### Requirement: 核心录像数据持久化
The system SHALL provide API endpoints to save Volcengine video metadata to the SQLite database via Drizzle ORM, allowing user searches based on `date`, `role`, and `username`.

#### Scenario: Success case
- **WHEN** user uploads a video to Volcengine and sends a POST request with the metadata
- **THEN** the system stores the metadata in `replay_videos` and returns the newly generated UUID.

### Requirement: 高亮与评论系统
The system SHALL support creating highlights linked to specific videos via `video_id`, and subsequently appending comments to these highlights using `highlight_id`.

#### Scenario: Success case
- **WHEN** user adds a comment at a specific timestamp in the player
- **THEN** the system creates a `replay_highlight` (if one doesn't exist for the timestamp) and inserts a `replay_comment` linked to it.