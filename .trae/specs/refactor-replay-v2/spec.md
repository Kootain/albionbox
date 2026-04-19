# Replay V2 项目架构重构 Spec

## Why
当前 `/apps/replay-v2` 项目结构存在耦合问题，所有核心状态逻辑和 UI（如 `App.tsx`, `Dashboard.tsx`）混合在较少的文件中，且根目录结构未对齐主站 `/apps/web` 的标准规范（如缺乏 `pages/`, `hooks/`, `i18n/`, `types/` 等专用包）。为提高代码可维护性、遵循 Clean Code 单一职责原则，并在团队内部建立统一的架构心智模型，需要对该项目进行代码层面的结构拆分与重构。

## What Changes
- **目录级重构**：新建 `src/components`, `src/hooks`, `src/i18n`, `src/pages`, `src/types` 等目录，严格对齐 `/apps/web` 设计风格。
- **状态与逻辑抽离**：将 `App.tsx` 中与录像数据（Videos）加载、删除、Mock 数据 Seed 相关的复杂逻辑抽离到自定义 Hook（`useVideos.ts`）。
- **页面级组件化**：将原 `Dashboard.tsx` 和主应用的业务内容提取到 `src/pages/dashboard/DashboardPage.tsx` 页面级组件中。
- **UI 与布局拆分**：
  - 将原 `App.tsx` 内嵌的 Header 和悬浮按钮拆分为公共布局 `src/components/layout/AppShell.tsx`。
  - 将 `Dashboard.tsx` 内过长的循环渲染体拆分为独立的表现组件（如 `VideoGroup.tsx`, `VideoCard.tsx`），保证单一文件的代码行数可控、职责单一。
- **配置与上下文拆分**：移动 `LanguageContext.tsx` 到 `src/i18n` 目录，移动 `types.ts` 到 `src/types/index.ts`。
- **弹窗组件归类**：将 `UploadModal.tsx` 和 `PlayerModal.tsx` 移至专用的模态框目录（`src/components/modals/`）。

**注意**：此重构**完全禁止**对任何功能进行修改，只能在保持原有行为、样式一致的基础上进行组件边界拆分和目录结构的变更。

## Impact
- Affected specs: 无功能性影响。
- Affected code: `/apps/replay-v2/src/` 下几乎所有的 TypeScript/TSX 文件将被移动、拆分和重写引用路径。

## ADDED Requirements
### Requirement: 目录规范强制对齐
系统应保证在 `/apps/replay-v2` 中：
- `src/pages` 用于页面级组件组合
- `src/components` 用于通用和布局 UI
- `src/hooks` 用于业务逻辑状态隔离
- `src/i18n` 用于语言与多语言配置上下文
- `src/types` 用于类型定义

## MODIFIED Requirements
### Requirement: 页面职责拆分
原 `App.tsx` 应被改造为纯粹的 Provider 包裹层和路由/页面挂载层，不包含具体的业务逻辑与界面元素。业务逻辑移交 `DashboardPage` 和对应 Hooks。