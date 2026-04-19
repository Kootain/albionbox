# Cloudflare Player Integration Spec

## Why
Currently, the playback system (`PlayerModal.tsx`) relies entirely on the HTML5 `<video>` element, playing direct MP4 URLs obtained via Volcengine. Since we've added Cloudflare Stream as an upload provider, videos uploaded via Cloudflare only have a `stream-media-id`. To play these, we need to integrate Cloudflare's Stream Player SDK (`@cloudflare/stream-react`), while seamlessly falling back to the native `<video>` element for legacy Volcengine uploads.

## What Changes
- **Backend (`router.ts`)**: Update `getVideosHandler` to detect Cloudflare videos based on the 32-character hex `vid`. If it's a Cloudflare video, return a specific prefix (`cloudflare:${video.vid}`) in `videoUrl` instead of attempting to fetch a Volcengine signed URL.
- **Frontend (`PlayerModal.tsx`)**:
  - Install `@cloudflare/stream-react` dependency.
  - Parse the `videoUrl` to determine if the main video or PIP video uses Cloudflare or Volcengine.
  - Conditionally render the `<Stream>` component or the native `<video>` element based on the provider.
  - Implement unified player access (adapter pattern) so that timeline sync, play/pause, volume control, and seeking work seamlessly across both player types (or even a mix, e.g., Main=Cloudflare, PIP=Volcengine).

## Impact
- Affected specs: `add-cloudflare-stream-upload`
- Affected code:
  - `apps/api/src/modules/replay/router.ts`
  - `apps/replay/src/components/modals/PlayerModal.tsx`
  - `apps/replay/package.json`

## ADDED Requirements
### Requirement: Hybrid Player Support
The system SHALL support concurrent playback of both native video streams (Volcengine) and Cloudflare Stream videos in the same interface (Main and PIP), fully synchronizing their timelines.

#### Scenario: Success case
- **WHEN** the user opens a Cloudflare-hosted video
- **THEN** the modal uses the `@cloudflare/stream-react` player.
- **AND WHEN** the user selects a Volcengine-hosted video as a PIP
- **THEN** the modal plays the PIP via a native `<video>` element and syncs its timeline to the main Cloudflare player accurately.