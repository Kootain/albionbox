# Tasks

- [ ] Task 1: 建立全局上传状态管理 (Context / Hook)
  - [ ] SubTask 1.1: 创建 `apps/replay/src/hooks/useUploadQueue.ts` 或 Context。定义上传项类型 `UploadItem` (id, file, role, date, username, progress, status, error)。
  - [ ] SubTask 1.2: 将 `UploadModal` 里的 `fetchStsToken` 和 `TTUploader` 初始化逻辑移入到队列处理函数中。
  - [ ] SubTask 1.3: 实现队列调度逻辑：当有文件被添加时，依次或并发上传，上传完成后调用后端 `createVideo`，并在全部完成后触发 `onUploaded` 刷新回调。

- [ ] Task 2: 改造 UploadModal
  - [ ] SubTask 2.1: 将 `input[type="file"]` 加上 `multiple`，并且允许在拖拽时获取 `e.dataTransfer.files` 中的多个文件。
  - [ ] SubTask 2.2: 在 UI 上展示已选择的多个文件名或总数。
  - [ ] SubTask 2.3: 点击提交时，不再在模态框内 `await`，而是调用 `useUploadQueue` 的 `addTasks(files, meta)` 方法，并直接关闭 Modal。

- [ ] Task 3: 编写右下角进度浮窗组件
  - [ ] SubTask 3.1: 创建 `apps/replay/src/components/ui/UploadProgressToast.tsx`。
  - [ ] SubTask 3.2: 订阅 `useUploadQueue` 里的任务列表，循环渲染每个任务的文件名和进度条。
  - [ ] SubTask 3.3: 如果所有任务都已完成（或失败），展示一个可关闭的按钮。
  - [ ] SubTask 3.4: 在 `AppShell.tsx` 或 `DashboardPage.tsx` 中引入该组件并固定在 `fixed bottom-6 right-6`。

- [ ] Task 4: 语言和类型清理
  - [ ] SubTask 4.1: 在 `LanguageContext` 补充关于多文件上传的文案（如 "X files selected", "Upload Queue" 等）。
  - [ ] SubTask 4.2: 运行 `tsc --noEmit` 保证通过。

# Task Dependencies
- Task 2 和 3 依赖于 Task 1 提供的全局状态/队列处理。
- Task 4 需要在全部组件开发完毕后校验。