# Tasks
- [x] Task 1: Install `@cloudflare/stream-react` in `apps/replay`.
- [x] Task 2: Backend: In `apps/api/src/modules/replay/router.ts`, modify `getVideosHandler` to detect Cloudflare `vid` (length 32 and alphanumeric, no 'v' prefix). For these, set `videoUrl = 'cloudflare:' + video.vid` instead of calling `getPlayInfo`.
- [x] Task 3: Frontend: In `PlayerModal.tsx`, parse `blobUrl` and `pipBlobUrl` to extract `cloudflare:ID` vs `http...`.
- [x] Task 4: Frontend: In `PlayerModal.tsx`, introduce `mainStreamRef` and `pipStreamRef` refs, and implement a unified `getMainPlayer()` and `getPipPlayer()` helper function to return the correct underlying API (either `videoRef.current` or `streamRef.current`).
- [x] Task 5: Frontend: In `PlayerModal.tsx`, replace the `<video>` components with conditional renders. Render the `<Stream src={vid} streamRef={mainStreamRef} ... />` component for Cloudflare videos, mapping `onLoadedMetaData`, `onTimeUpdate`, `onEnded`, `onPlay`, `onPause` properly. Make sure the styling (`opacity: 0.3` etc.) works by applying it to a wrapper `<div>` for PIP.

# Task Dependencies
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 4]