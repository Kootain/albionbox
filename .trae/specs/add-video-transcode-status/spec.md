# Add Video Transcode Status Spec

## Why
在现有的 replay 模块中，视频上传后转码是一个异步过程。前端目前无法直观地知道视频是否正在转码中，并且只能获取到单一清晰度的播放地址。增加转码状态字段和多码率解析，能让用户明确视频的状态，并在播放时看到支持的多码率选项，提升观看体验，同时也利用数据库缓存转码结果，减少对视频平台的 API 请求。

## What Changes
- 数据库 `replayVideos` 表增加 `transcodeStatus` JSON 字段，用于记录并缓存不同分辨率下转码完成的播放 URL（例如 `{"720p": "url1", "360p": "url2"}`）。
- 后端新增 Volcano Engine 转码完成的 Webhook 回调接口 (`/volcengine-webhook`)，接收 `WorkflowComplete` 事件，解析多分辨率 URL 并写入数据库。
- 修改视频列表 API (`getVideosHandler`)，解析并返回多码率的 URL 列表字段。
- 前端播放器 Modal (`PlayerModal.tsx`) 根据该字段显示状态：若无多码率 URL 则在视频区域显示“转码中...”；若有，则在视频右下角展示支持的码率标签（如 720p, 360p）。

## Impact
- Affected specs: 视频数据结构、视频播放 UI、视频上传后处理
- Affected code:
  - `packages/db/src/schema/replay.ts`
  - `apps/api/src/modules/replay/router.ts`
  - `apps/api/src/modules/replay/volcengine.ts`
  - `apps/replay/src/components/modals/PlayerModal.tsx`
  - `apps/replay/src/types/index.ts`

## ADDED Requirements
### Requirement: Video Transcode Status Tracking
系统应当记录视频转码的状态，并在完成后提供多码率播放地址的持久化记录。

#### Scenario: Transcode completes
- **WHEN** Volcano Engine 发送 WorkflowComplete 回调
- **THEN** 后端解析对应视频的 `Vid` 和转码结果，获取多分辨率的 URL，更新至该视频的 `transcodeStatus` JSON 字段。

### Requirement: Frontend Transcode Status Display
前端应直观展示视频是否可用及可用码率。

#### Scenario: Video is transcoding
- **WHEN** 用户点击播放一个 `transcodeStatus` 为空或没有对应解析结果的视频
- **THEN** 播放界面不渲染视频流，而是显示“转码中...”的状态提示。

#### Scenario: Video has multi-bitrate available
- **WHEN** 用户点击播放一个转码完成且带有多分辨率 URL 的视频
- **THEN** 播放界面正常渲染最高或默认清晰度的视频，并在右下角展示其支持的码率（如 720p, 360p）。
