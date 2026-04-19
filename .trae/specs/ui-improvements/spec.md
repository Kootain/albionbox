# Player and Card UI Improvements Spec

## Why
当前系统的两个 UI 细节体验较差：
1. `VideoCard` 视频卡片的高度太长，视觉比例失调。且如果视频没有独立的封面图片，需要利用玩家 ID (username) 来作为默认封面。
2. `PlayerModal` 的底部播放器控制栏（含时间轴和按钮）在移动端或较窄屏幕下会因为空间不足而产生换行，导致按钮内的文字被挤压成竖长条，严重影响美观与可用性。

## What Changes
- **VideoCard 优化**:
  - 修改 `VideoCard.tsx` 中封面的容器 `div`，将其背景调整。若没有专门的 `cover` 属性，则在此区域居中展示 `username` 的缩写或大号文字，代替原本只显示 `▶` 的单调设计。
  - 缩减卡片的整体高度与 Padding，使其更符合列表展示的紧凑美感。
- **PlayerModal 底部响应式优化**:
  - 优化底部控制栏（`.flex.justify-between.items-center`），使其在小屏幕下变为可滚动的行，或者将其中的按钮文字隐藏仅显示图标，避免文字换行挤压。
  - 使用 `whitespace-nowrap` 防止按钮内的中英文字符因为宽度不够而换行。
  - 在移动端媒体查询 (`@media`) 或者使用 tailwind 的 `md:` 类对 `flex-wrap` 及 `gap` 进行更合理的分配。

## Impact
- Affected specs: 改善了不同屏幕尺寸下的响应式展示效果。
- Affected code:
  - `apps/replay/src/components/modals/PlayerModal.tsx`
  - `apps/replay/src/pages/dashboard/components/VideoCard.tsx`

## ADDED Requirements
### Requirement: Responsive Player Controls
The system SHALL ensure the player control bar remains functional and visually intact on narrow screens without awkward text wrapping.

### Requirement: Fallback Video Cover
The system SHALL display the player's username prominently as a fallback cover on video cards when no thumbnail is available.

#### Scenario: Success case
- **WHEN** user views the dashboard on a mobile device
- **THEN** the video cards look compact with the username as the cover, and the player controls don't break their layout.