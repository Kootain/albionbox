# Tasks

- [x] Task 1: 基础包结构调整与公共模块迁移
  - [x] SubTask 1.1: 创建 `src/types`、`src/i18n`、`src/hooks`、`src/components/layout`、`src/components/modals`、`src/pages/dashboard/components` 目录。
  - [x] SubTask 1.2: 迁移 `src/types.ts` 至 `src/types/index.ts`，并修正其他文件的引用。
  - [x] SubTask 1.3: 迁移 `src/components/LanguageContext.tsx` 至 `src/i18n/LanguageContext.tsx`，并修正引用路径。

- [x] Task 2: 核心状态与业务逻辑抽离 (Custom Hooks)
  - [x] SubTask 2.1: 新建 `src/hooks/useVideos.ts`。
  - [x] SubTask 2.2: 将 `App.tsx` 中关于 `videos` 状态的声明、`refreshVideos`、Mock Seed 初始化逻辑、`handleDelete`、`handleUpdate` 逻辑封装至该 Hook 中，并暴露对应的状态与方法。

- [x] Task 3: 全局布局与通用组件提取
  - [x] SubTask 3.1: 创建 `src/components/layout/AppShell.tsx`，将原 `App.tsx` 中的 `<header>`、右下角悬浮按钮（FAB）及滚动事件监听逻辑移至其中，暴露 `children` 插槽。
  - [x] SubTask 3.2: 迁移 `UploadModal.tsx` 到 `src/components/modals/UploadModal.tsx`。
  - [x] SubTask 3.3: 迁移 `PlayerModal.tsx` 到 `src/components/modals/PlayerModal.tsx`。

- [x] Task 4: 页面级组件与视图细化 (Dashboard 重构)
  - [x] SubTask 4.1: 创建 `src/pages/dashboard/components/VideoCard.tsx`，从原 `Dashboard.tsx` 中抽离单一视频卡片的渲染 UI。
  - [x] SubTask 4.2: 创建 `src/pages/dashboard/components/VideoGroup.tsx`，抽离按角色/按日期分组渲染块的代码。
  - [x] SubTask 4.3: 创建 `src/pages/dashboard/DashboardPage.tsx`，集成 `useVideos` 逻辑、`Dashboard` 渲染列表及上传/播放 Modal 弹窗的状态与渲染。
  - [x] SubTask 4.4: 废弃并删除原 `src/components/Dashboard.tsx` 文件。

- [x] Task 5: 整理应用主入口
  - [x] SubTask 5.1: 重写 `src/App.tsx`，清理所有被移走的业务逻辑，仅保留 `<LanguageProvider>` 等上下文包裹，以及作为入口挂载 `DashboardPage`。
  - [x] SubTask 5.2: 执行 TypeScript 类型检查 (`tsc --noEmit`) 确保所有新文件的 Import/Export 路径和引用无误。

# Task Dependencies
- Task 2 依赖于 Task 1（需提前建立好目录和类型支持）。
- Task 3 和 Task 4 并行依赖于 Task 2 的 Hook 拆分完成。
- Task 5 依赖于所有前置 Task（整合所有拆分后的模块并确保可运行）。