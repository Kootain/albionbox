# Global Highlights Spec

## Why
目前 `PlayerModal` 的时间轴上只能展示当前视频本身绑定的高亮。由于同一次战斗中存在其他视角的视频（只要它们对齐了世界时间），我们希望在播放某个视频时，如果该视频绑定了 UTC 时间，就能在时间轴上查询并展示当前时间范围内（视频开始到结束的绝对时间）其他所有相关视频的高亮。同时，需要优化当前时间轴上高亮的视觉样式，并区分本视频与其他视频的高亮颜色。

## What Changes
- **API**: 在 `apps/api/src/modules/replay/router.ts` 增加 `GET /highlights/global` 接口，支持传入 `startTime` 和 `endTime`（绝对时间戳），返回在该范围内的所有高亮记录及其关联的评论（或者返回能够满足在时间轴渲染的数据结构）。
- **Frontend Fetch**: 在 `apps/replay/src/lib/api.ts` 中增加 `getGlobalHighlights(start, end)` 方法。
- **Frontend Player**:
  - 当 `mainVideo` 具备 `absoluteStartTime` 时，计算 `endTime` (开始时间 + duration)。
  - 调用 `getGlobalHighlights` 并将其缓存为 `globalHighlights` 状态。
  - 在时间轴渲染 `mainVideo.highlights` 与 `globalHighlights`（去重）。
  - **样式区分**: 本视频的高亮使用橙色 (`bg-system-accent`)，其他视角视频带来的高亮使用蓝色或其他明显区分的颜色（如 `#3b82f6`），并优化高亮标记的样式使其更美观（如变为带有细微阴影的圆形或水滴形）。
  - 悬浮时，能够显示这个高亮来自于哪个视角（username）。

## Impact
- Affected specs: 强化了多视角复盘的信息密度，能够看到队友在其他视角下做的标记。
- Affected code:
  - `apps/api/src/modules/replay/router.ts`
  - `apps/replay/src/lib/api.ts`
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: Global Highlights by Time Range
The system SHALL allow querying all highlights across all videos that fall within a specified absolute UTC time range.
The frontend SHALL display these global highlights on the timeline of the currently playing video, converting their absolute times back to the local relative timeline.

#### Scenario: Success case
- **WHEN** user plays a video with a bound UTC time
- **THEN** the timeline displays local highlights in one color and global highlights from other videos in another color, mapped accurately to the playback timeline.