# Tasks
- [x] Task 1: Update Database & Shared Schemas: In `packages/db/src/schema/replay.ts`, add `title: text('title')` to the `replayVideos` table. Run `pnpm db:generate` to create the SQL migration file. In `packages/shared/src/schemas/replay.ts`, add `title: z.string().optional()` to both `CreateReplayVideoSchema` and `UpdateReplayVideoSchema`.
- [x] Task 2: Update Backend Router: In `apps/api/src/modules/replay/router.ts`, update the `createVideoHandler` to insert `title: data.title ?? null` and the PUT `/:id` handler to update the `title` if it's provided in the payload.
- [x] Task 3: Update Frontend Upload & Types: In `apps/replay/src/types/index.ts`, add `title?: string` to `VideoRecord`. In `apps/replay/src/hooks/useUploadQueue.tsx`, pass `title: pendingTask.file.name` as part of the `createVideo` payload.
- [x] Task 4: Add Title Editing to Edit Modal: In `apps/replay/src/i18n/LanguageContext.tsx`, add translations for `edit.videoTitle` (e.g., 'Video Title' / '视频标题'). In `apps/replay/src/components/modals/EditVideoModal.tsx`, add a text input for the `title` field and include it in the `updateVideo` call.
- [x] Task 5: Update VideoCard UI: In `apps/replay/src/pages/dashboard/components/VideoCard.tsx`, change the top row to display `video.title || video.filename || 'Untitled'` instead of `username`. Modify the bottom row layout to `flex justify-between items-center`, keeping the filename and marks on the left, and placing `<span>{username}</span>` on the far right.
- [x] Task 6: Update PlayerModal UI: In `apps/replay/src/components/modals/PlayerModal.tsx`, update the top-left video info overlay to display `{mainVideo.title || mainVideo.filename} / {mainVideo.username}`.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 3]