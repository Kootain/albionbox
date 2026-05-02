# Prevent Duplicate Ticket Submission Spec

## Why
在补装申请预览状态下创建 Ticket（工单）时，由于缺乏请求过程中的 `loading` 和按钮 `disabled` 状态，用户如果快速连续点击“Create Ticket”按钮，会导致发起多次重复的创建请求，进而生成重复的补装工单，造成数据混乱。

## What Changes
- 在 `RegearTab` 中，执行 `handleCreateOrderFromPreview` 时增加一个 `isCreatingOrder` 状态。
- 将 `isCreatingOrder` 作为 `isCreating` 属性传递给子组件 `RegearDetail`。
- 在 `RegearDetail` 组件内，使用 `isCreating` 状态控制“Create Ticket”按钮：
  - 当 `isCreating` 为 `true` 时，按钮变为 `disabled` 状态。
  - 当 `isCreating` 为 `true` 时，按钮显示加载状态（如 Loader 图标）。

## Impact
- Affected specs: 补装工单创建流程
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`
  - `apps/web/src/pages/guild-dashboard/tabs/regear-components/RegearDetail.tsx`

## ADDED Requirements
### Requirement: 防止重复创建工单
系统在从预览状态提交创建工单请求时，必须阻塞并禁止用户的额外提交操作，直到请求响应（成功或失败）。

#### Scenario: Success case
- **WHEN** 用户点击“Create Ticket”按钮
- **THEN** 按钮立即变为不可点击（disabled），并显示 loading 状态，系统开始请求后端 API。
- **THEN** 在请求结束后（无论是成功还是报错提示），按钮状态重置，或直接跳转进入新的工单详情。