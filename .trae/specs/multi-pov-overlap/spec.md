# Multi-POV Overlap Detection Spec

## Why
目前计算“其他视角” (Multi-POV) 的逻辑不够精确且存在硬编码降级（如果 duration 未知则回退到 3600 秒）。这导致时间线有重叠的视频无法正确出现在“POV”列表中。我们需要优化视频元数据的提取与返回，使得只要视频加载了时长（或后端已经存储了真实时长），前端就能通过精确的绝对起止时间 `[absoluteStartTime, absoluteStartTime + duration * 1000]` 计算出视频之间的 Overlap。

## What Changes
- **Backend**: 修改 `apps/api/src/modules/replay/router.ts`，确保在创建视频或更新视频时，能正确写入视频的实际 `duration`。如果是从视频源解析的，应尽量保障 `duration` 的下发。
- **Frontend**:
  - `PlayerModal.tsx` 中 `otherPovs` 的计算逻辑彻底重写。
  - 不再依赖 `v.date === mainVideo.date` 的 fallback。
  - 直接依赖视频列表中的所有视频，对每个视频计算其 `absoluteStartTime` 和 `duration`，并将其转换为 `[start, end]` 区间。
  - 若 `mainVideo` 具备绝对起止时间，检查其他具备绝对起止时间的视频是否与之存在交集：`vStart < mainEnd && vEnd > mainStart`。
  - 对于没有 `duration` 的视频，可能需要在获取视频列表后、播放器装载时动态补全其 duration（但如果可能，我们通过接口返回正确的 duration 来避免降级）。

## Impact
- Affected specs: Multi-POV (多视角) 同步与列表展现逻辑
- Affected code:
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: Accurate POV Overlap Calculation
The system SHALL display a video in the "Multi-POV" list IF AND ONLY IF its absolute time window `[absoluteStartTime, absoluteStartTime + duration]` overlaps with the currently playing video's absolute time window.

#### Scenario: Success case
- **WHEN** two videos from different users share an overlapping UTC timeframe
- **THEN** they will appear in each other's POV list regardless of their recorded `date` field.