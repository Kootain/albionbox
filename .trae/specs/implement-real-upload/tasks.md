# Tasks

- [x] Task 1: 添加依赖与环境变量支持
  - [x] SubTask 1.1: 在 `apps/replay-v2/package.json` 中添加 `tt-uploader` 依赖（可参考 `/apps/replay` 中的版本号 `^1.6.1`）。
  - [x] SubTask 1.2: 在 `apps/replay-v2/.env.example` 中补充火山引擎 VOD 相关的环境变量示例（如 `VITE_VOLC_APP_ID` 和 `VITE_VOLC_SPACE_NAME`）。

- [x] Task 2: 扩展数据模型
  - [x] SubTask 2.1: 在 `apps/replay-v2/src/types/index.ts` 中的 `VideoRecord` 接口增加 `vid?: string` 字段，以存储火山引擎视频的唯一 ID。

- [x] Task 3: 重写 UploadModal 核心逻辑
  - [x] SubTask 3.1: 在 `UploadModal.tsx` 中引入 `TTUploader`，并新增上传状态相关的 state：`uploadStatus` ('idle' | 'uploading' | 'success' | 'error') 和 `progress` (number)。
  - [x] SubTask 3.2: 移植 `fetchStsToken` 逻辑，从远程鉴权 Worker (`https://volc-auth-worker.kootain.workers.dev/api/vod/upload-token`) 获取 token（如失败提供 fallback）。
  - [x] SubTask 3.3: 在 `handleSubmit` 中移除 `storeVideoBlob` 调用。通过 `new TTUploader(...)` 初始化上传，绑定 `progress`、`complete` 和 `error` 事件。
  - [x] SubTask 3.4: 在 `complete` 回调中，从 `info.uploadResult` 提取 `Vid`，构造 `VideoRecord`（将 `vid` 存入，`blobId` 填为 `remote_${vid}`），调用 `saveVideoMetadata` 保存数据并执行 `onUploaded()` 及 `onClose()`。

- [x] Task 4: 更新 UI 与交互反馈
  - [x] SubTask 4.1: 在 `UploadModal.tsx` 界面中加入进度条 UI：当 `uploadStatus === 'uploading'` 时，隐藏原本的“上传文件”区域或在下方显示一个带有百分比的进度条，并禁用表单所有输入项。
  - [x] SubTask 4.2: 提供明显的错误提示（如未配置 `APP_ID`、`SPACE_NAME` 或上传失败时）。
  - [x] SubTask 4.3: 确保用户在上传过程中点击背景或关闭按钮时，能够进行二次确认或直接禁用关闭，防止误触中断上传。

# Task Dependencies
- Task 3 和 Task 4 依赖于 Task 1 成功安装 `tt-uploader`。