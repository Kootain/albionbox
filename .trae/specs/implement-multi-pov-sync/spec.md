# Multi-POV Sync Feature Spec

## Why
在进行多人团队活动复盘时，仅仅观看单一视角的录像往往无法还原战局全貌。用户希望能够在播放某个玩家视角的视频时，基于“真实世界时间点（全局时间点）”无缝切换并同步查看其他玩家的视角，以获取更全面的战场信息。

## What Changes
- 在 `VideoRecord` 数据模型中增加 `globalStartTime` 字段，记录视频对应的真实世界起点时间戳。
- 在播放器模态框 (`PlayerModal.tsx`) 中，新增“全局时间绑定”功能：用户可以将当前播放画面绑定到一个具体的真实世界时间（或通过某一阵营倒计时计算出全局起点）。
- 在播放器中增加“其他视角 (Multi-POV)” 列表入口。
- 点击其他玩家视角时，通过 Picture-in-Picture (PiP) 模式在右下角静音播放原来的视频，主界面切换为新选择的玩家视频。
- 主视频与小窗视频建立播放进度同步机制：当主视频播放、暂停或拖动进度条时，小窗视频会基于它们各自的 `globalStartTime` 自动计算并跳转到对应的同步时间点。
- 支持点击右下角的小窗视频，将小窗视频与主视频进行互换，并且在互换后继续保持真实时间的同步关系。

## Impact
- Affected specs: 无，这是一个纯新增的功能增强。
- Affected code:
  - `src/types/index.ts` (数据结构扩展)
  - `src/components/modals/PlayerModal.tsx` (播放器核心逻辑和 UI)
  - `src/pages/dashboard/DashboardPage.tsx` (向 PlayerModal 传入全局视频列表以便筛选)
  - `src/i18n/` (多语言词条新增)

## ADDED Requirements
### Requirement: 绑定全局时间点
系统必须允许用户在播放器内将当前视频进度对应到一个“真实世界时间”，并将其计算为 `globalStartTime` 持久化保存到数据库中。

### Requirement: 视角切换与时间同步 (PiP 模式)
- **WHEN** 用户点击另一个绑定了全局时间且与当前时间重叠的玩家视角时，
- **THEN** 新视角的视频应作为主视频加载，直接定位到当前的“真实世界时间”对应的进度。原来的主视频缩小至右下角成为静音的小窗视频。
- **WHEN** 用户拖动或播放主视频时，
- **THEN** 小窗视频根据公式 `PipCurrentTime = MainCurrentTime + (MainGlobalStartTime - PipGlobalStartTime)` 自动跳转并同步播放。

### Requirement: 视角互换
- **WHEN** 用户点击右下角的小窗视频时，
- **THEN** 小窗视频与主视频的画面和数据互相交换。交换后，新的主视频维持当前的“真实世界时间”进度，并接管播放控制权。