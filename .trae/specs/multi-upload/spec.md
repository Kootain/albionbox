# Multiple Upload Spec

## Why
目前 `UploadModal` 只支持选择单个视频文件并上传，这在用户想要同时上传几场比赛录像时效率较低。我们需要支持多选，同时通过右下角的浮动提示框展示各个文件的上传进度。

## What Changes
- 修改 `UploadModal.tsx`：
  - `<input type="file" />` 增加 `multiple` 属性。
  - 将单选 `file` 状态改为 `files: File[]` 数组。
  - 将原有的单文件上传流程剥离。点击 `Submit` 后，关闭当前的 `UploadModal`，将 `files` 数组传递给父组件（或者通过 Context/Store 传递）。
- 创建 `UploadProgressToast.tsx` 组件：
  - 用于固定在右下角的浮窗，接收上传队列状态并渲染每一个任务的进度。
  - 处理每一个文件的火山引擎 TTUploader 上传及后端 `createVideo` API 调用逻辑（或者可以放在一个统一的 Upload Context 中）。
- 将上传任务的控制提升至应用层 (`AppShell` 或 `DashboardPage`)：
  - 当 `UploadModal` 确认后，触发主页的上传处理队列。

## Impact
- Affected specs: 上传流程从模态框内部阻塞变为后台异步处理。
- Affected code:
  - `apps/replay/src/components/modals/UploadModal.tsx`
  - `apps/replay/src/components/ui/UploadProgressToast.tsx` (新)
  - `apps/replay/src/pages/dashboard/DashboardPage.tsx`
  - `apps/replay/src/i18n/LanguageContext.tsx` (可能需要补充多文件相关的翻译)

## ADDED Requirements
### Requirement: 多文件并发/串行上传
The system SHALL allow users to select multiple video files at once and upload them asynchronously in the background.
The system SHALL display a progress toast in the bottom right corner showing the status of each file in the queue.

#### Scenario: Success case
- **WHEN** user selects 3 videos, sets the role and date, and clicks "Upload"
- **THEN** the modal closes, a toast appears in the bottom right showing 3 progress bars, and each video uploads. Upon completion, the dashboard list refreshes automatically.