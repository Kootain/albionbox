# Add Video Title Spec

## Why
Currently, videos are primarily identified by the uploader's username and the raw filename, which makes it hard to distinguish between multiple replays from the same user. Adding a customizable video title will significantly improve organization and user experience.

## What Changes
- Add a `title` field to the `replayVideos` database schema and run the migration generator.
- Update the API payload validation schemas to accept `title` (optional string) for creation and updates.
- Update the API backend handlers to persist the `title` field in the database.
- During video upload, default the `title` to the original uploaded file's name.
- Add a "Video Title" input to `EditVideoModal` so users can rename their replays.
- **UI Changes**:
  - In `VideoCard.tsx` (Dashboard), replace the top-left username display with the video's `title` (falling back to `filename`). Move the `username` to the rightmost side of the bottom row (the row displaying the filename and comments/marks count).
  - In `PlayerModal.tsx`, update the top-left video info overlay to show `{video.title || video.filename} / {video.username}` instead of `{video.username} / {video.filename}`.

## Impact
- Affected specs: Database schema, Backend API schemas.
- Affected code: 
  - `packages/db/src/schema/replay.ts`
  - `packages/shared/src/schemas/replay.ts`
  - `apps/api/src/modules/replay/router.ts`
  - `apps/replay/src/types/index.ts`
  - `apps/replay/src/hooks/useUploadQueue.tsx`
  - `apps/replay/src/i18n/LanguageContext.tsx`
  - `apps/replay/src/components/modals/EditVideoModal.tsx`
  - `apps/replay/src/pages/dashboard/components/VideoCard.tsx`
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: Video Title Management
The system SHALL support storing and displaying a custom title for each video.
#### Scenario: Success case
- **WHEN** a user uploads a video, **THEN** the video's title is automatically populated with the file name.
- **WHEN** a user views the video list, **THEN** the title is prominently displayed at the top of the card, and the username is shifted to the bottom right.
- **WHEN** a user clicks edit on a video, **THEN** they can modify the video title and save it.