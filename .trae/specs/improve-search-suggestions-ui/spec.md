# 搜索 Suggestion UI 改进 Spec

## Why
当前补装审批页的 Kook 用户/频道 Suggestion 依赖原生 datalist，样式不可控且一次性展示过多条目，影响可读性与交互体验。

## What Changes
- 用自定义下拉 Suggestion 替代原生 datalist。
- 默认最多展示 N 条（例如 8 条），超出部分在下拉层内滚动查看。
- 下拉层视觉风格与现有黑金主题一致（黑底、边框、hover、阴影、圆角），并在输入框下方对齐。
- 支持键盘/鼠标基本交互：
  - 聚焦或输入时显示
  - 失焦点击外部关闭
  - 点击选项填充输入框
  - Esc 关闭
- 数据源：使用已加载并缓存在浏览器中的 `channelsMap/usersMap` 做本地过滤，不触发额外请求。

## Impact
- Affected specs: 补装审批页筛选体验
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`
  - （可选）抽取通用组件：`apps/web/src/components/ui/SuggestionInput.tsx`

## ADDED Requirements
### Requirement: 可滚动 Suggestion 下拉
系统 SHALL 在输入框下方展示最多 N 条匹配建议，并在超出时允许滚动查看。

#### Scenario: Success case
- **WHEN** 用户聚焦或输入内容
- **THEN** 展示最多 N 条建议，超出部分可在下拉层滚动

### Requirement: 本地过滤
系统 SHALL 仅使用已缓存的 Kook 用户/频道数据做过滤，不发起额外请求。

#### Scenario: Success case
- **WHEN** 用户输入关键字
- **THEN** 下拉内容在本地数据中实时过滤

## MODIFIED Requirements
### Requirement: Suggestion 展示样式
- **WHEN** Suggestion 展示
- **THEN** 其样式与现有黑金 UI 统一，并不会一次性撑满页面
