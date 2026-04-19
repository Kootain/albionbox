# Tasks

- [x] Task 1: 扩展数据模型与准备基础依赖
  - [x] SubTask 1.1: 在 `src/types/index.ts` 的 `VideoRecord` 接口中增加 `globalStartTime?: number` 属性。
  - [x] SubTask 1.2: 在 `src/i18n/zh.json` 和 `src/i18n/en.json` 中添加相关多语言词条，如“绑定全局时间”、“其他视角”、“无其他视角”、“请先绑定时间”等。
  - [x] SubTask 1.3: 修改 `src/pages/dashboard/DashboardPage.tsx`，将 `videos` 列表作为 prop 传递给 `PlayerModal` 组件，以便其能够查找其他视角的视频。

- [x] Task 2: 实现全局时间绑定功能
  - [x] SubTask 2.1: 在 `PlayerModal.tsx` 的控制栏或侧边栏增加“绑定全局时间 (Sync Time)” 的按钮与输入 UI（例如：输入一个当前画面的真实世界时间字符串或相对偏移量，最简单的是提供一个 datetime-local 输入框或时间戳输入框）。
  - [x] SubTask 2.2: 实现计算逻辑：`globalStartTime = 输入的真实世界时间戳 - 当前视频 currentTime * 1000`。
  - [x] SubTask 2.3: 调用 `onUpdate` 和 `saveVideoMetadata` 更新当前视频的 `globalStartTime`，并在 UI 上反馈绑定成功。

- [x] Task 3: 实现“其他视角 (Multi-POV)” 列表选择
  - [x] SubTask 3.1: 在 `PlayerModal.tsx` 增加“查看其他视角”的按钮，点击时弹出下拉列表或侧边栏列表。
  - [x] SubTask 3.2: 如果当前视频没有 `globalStartTime`，点击按钮时提示“请先绑定当前视频的全局时间”。
  - [x] SubTask 3.3: 过滤 `videos` 列表：仅展示与当前视频 `date` 相同、拥有 `globalStartTime`、且 `id` 不同的视频记录，展示形式为 `playerId`。
  - [x] SubTask 3.4: 实现点击列表中某个 `playerId` 的回调逻辑：将该视频设置为 `pipVideoRecord`。

- [x] Task 4: 实现画中画 (PiP) 视频渲染与播放同步
  - [x] SubTask 4.1: 在 `PlayerModal.tsx` 中增加 `pipVideoRecord` 和 `pipVideoUrl` 的状态，并新增一个定位在右下角、无声 (`muted`) 的 `<video>` 元素用于渲染小窗。
  - [x] SubTask 4.2: 实现同步逻辑 (Sync Engine)：在主 `<video>` 的 `onPlay`, `onPause`, `onTimeUpdate` 和 `onSeeked` 事件中，根据主视频当前的全局时间 `currentGlobalTime = mainGlobalStartTime + mainCurrentTime * 1000`，计算并设置小窗 `<video>` 的 `currentTime` 为 `(currentGlobalTime - pipGlobalStartTime) / 1000`。
  - [x] SubTask 4.3: 处理小窗视频的边界情况：如果计算出的 `currentTime` 小于 0 或大于视频总时长，应将其暂停或显示黑屏/遮罩。

- [x] Task 5: 实现主副视角无缝切换 (Swap)
  - [x] SubTask 5.1: 为右下角的小窗 `<video>` 或其外层容器增加 `onClick` 事件。
  - [x] SubTask 5.2: 点击互换逻辑：记录下切换瞬间的“全局时间点”，交换 `mainVideoRecord` 和 `pipVideoRecord` 的状态。
  - [x] SubTask 5.3: 状态交换后，利用 `useEffect` 或 refs 强制将新的主视频定位到刚才记录的全局时间点对应的 `currentTime`。

# Task Dependencies
- Task 2 依赖于 Task 1。
- Task 3 依赖于 Task 2。
- Task 4 和 Task 5 依赖于 Task 3 能够成功选出第二视角视频。