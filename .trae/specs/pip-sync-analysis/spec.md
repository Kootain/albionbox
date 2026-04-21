# 主窗小窗同步播放设计与 SDK 事件分析 Spec

## Why
目前主副窗视频同步依然存在一些边界和交互问题。为了彻底解决这些问题，我们需要先系统性地总结当前的主窗小窗同步设计思路，并详细梳理底层视频 SDK（VePlayer 及 Cloudflare Stream）的基本事件与触发逻辑，从而共同定位问题所在，为下一步重构做好理论准备。

## 现有同步设计思路 (Current Sync Logic)
目前同步的核心锚点是 **绝对时间 (Absolute Time)**，核心驱动是 **主窗的事件回调**：
1. **时间计算**：
   - 每次同步时，获取主窗的 `currentTime`。
   - `当前全局时间戳 = 主窗 absoluteStartTime + 主窗 currentTime`
   - `小窗目标时间 (pipTargetTime) = 当前全局时间戳 - 小窗 absoluteStartTime`
2. **状态驱动 (`syncPipVideo` 函数)**：
   - 该函数由主窗的 `timeupdate`、`seeked`、`waiting` (缓冲)、`playing` (缓冲结束恢复) 等事件高频触发。
3. **边界处理**：
   - **出界 (Out of bounds)**：如果 `pipTargetTime < 0` 或 `> 小窗 duration`，小窗会被强制 `seek` 到开头或结尾，并调用 `pause()` 暂停。同时用 `isPipOutOfBoundsRef` 记录出界状态。
   - **界内 (In bounds)**：如果小窗当前时间与 `pipTargetTime` 误差大于 0.5 秒，则强制 `seek` 修正。
4. **播放状态跟随**：
   - 如果主窗正在播放 (`!mainPlayer.paused`) 且不在缓冲中 (`!isMainBufferingRef.current`)，则命令小窗 `play()`。否则命令小窗 `pause()`。

## SDK 基础逻辑与核心事件介绍
无论是 HTML5 原生 `<video>` 还是封装后的 VePlayer / Cloudflare Stream，它们的生命周期事件基本遵循 W3C 标准：
- **`timeupdate`**：视频播放时高频触发（通常每秒 4-5 次）。是进度同步的最核心事件。
- **`seeked`**：用户拖动进度条，目标时间的数据加载完成时触发。
- **`waiting`**：由于网络原因或没有足够数据，视频需要停下来缓冲时触发。此时 `paused` 状态可能仍为 `false`（逻辑上还在播放，只是卡住了）。
- **`playing`**：视频从 `waiting` 缓冲状态恢复，或者从 `paused` 状态被调用 `play()` 且开始出画面时触发。
- **`play` / `pause`**：执行播放/暂停动作瞬间触发（不代表画面立刻动/停，只代表状态意图的改变）。
- **`loadedmetadata`**：视频元数据（如 `duration` 时长）加载完成时触发。

## 潜在的问题点分析 (Where the problems might be)
1. **异步播放冲突 (Promise Rejection)**：`video.play()` 是异步的，返回 Promise。如果在 `play()` 尚未 resolve 时，高频的 `timeupdate` 又触发 `syncPipVideo` 并调用了 `pause()`，会导致 `AbortError`。反之亦然。
2. **高频事件风暴**：`timeupdate` 触发非常频繁。如果误差判断（0.5s）或播放状态判断有微小延迟，会导致高频发送 `play/pause/seek` 指令，让底层播放器状态机混乱。
3. **Cloudflare 与 VePlayer 的差异**：`Stream` 组件的事件触发时机可能和 `VePlayer` 不完全一致。例如，有些播放器在 `seek` 时会先触发 `waiting`，有些不会。
4. **出界/入界的状态锁**：`wasOutOfBounds` 依赖于 ref 同步。如果主视频恰好在边界附近频繁波动，或者切换 POV 时绝对时间跳跃过大，状态锁可能会导致小窗反复处于 play/pause 的震荡中，从而假死。

## What Changes
- 本阶段仅为分析与总结，不直接修改代码。
- 通过此文档确认问题点后，将在下一步定义具体的重构任务。

## Impact
- Affected code: 无（分析阶段）。