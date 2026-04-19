# Add Highlight and Comment Edit/Delete Spec

## Why
目前 `apps/replay` 中的高亮（Highlight）和评论（Comment）只支持创建，无法进行编辑或删除。为了提升用户体验并方便纠错，我们需要在前端和后端为其增加修改和删除的功能，并确保只有创建者（基于 username 判断）才有权限执行这些操作。

## What Changes
- **Shared Schemas**: 在 `packages/shared/src/schemas/replay.ts` 中新增更新评论的 DTO (`UpdateReplayCommentSchema`) 和更新高亮的 DTO (`UpdateReplayHighlightSchema` - 如果需要更新高亮的时间或描述)。
- **API Backend**: 在 `apps/api/src/modules/replay/router.ts` 中增加 4 个新的路由端点：
  - `DELETE /highlights/:id`: 删除高亮（同时级联删除相关评论）。
  - `PUT /highlights/:id`: 更新高亮属性（如 timestamp 或 absoluteTime）。
  - `DELETE /comments/:id`: 删除评论。
  - `PUT /comments/:id`: 更新评论内容。
- **Frontend API Client**: 在 `apps/replay/src/lib/api.ts` 补充对应的 Hono RPC 调用方法 (`deleteHighlight`, `updateHighlight`, `deleteComment`, `updateComment`)。
- **Frontend UI**: 在 `PlayerModal.tsx` 中，为当前用户的评论增加编辑 (Edit) 和删除 (Delete) 按钮。同时在合适的位置（例如评论列表的第一条或者高亮面板头部）为高亮自身增加删除和修改功能。

## Impact
- Affected specs: 高亮与评论的管理权限完善，闭环了录像互动功能。
- Affected code:
  - `packages/shared/src/schemas/replay.ts`
  - `apps/api/src/modules/replay/router.ts`
  - `apps/replay/src/lib/api.ts`
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: 评论与高亮的更新和删除
The system SHALL provide API endpoints to update and delete highlights and comments. The frontend SHALL display edit/delete controls only for the author of the comment/highlight (based on the globally bound account `username`).

#### Scenario: Success case
- **WHEN** user clicks "Delete" on their own comment
- **THEN** the frontend calls `DELETE /comments/:id`, removes it from the local state upon success, and updates the UI without a full reload.