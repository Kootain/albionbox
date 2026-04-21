# Tasks
- [x] Task 1: Fix PiP Audio Muting: In `PlayerModal.tsx`, update the volume sync `useEffect` to explicitly enforce `pipPlayer.muted = true` and `mainPlayer.muted = volume === 0` whenever `volume`, `blobUrl`, or `pipBlobUrl` changes.
- [x] Task 2: Persist Bitrate Selection: Introduce a `selectedUrls` state map in `PlayerModal.tsx` to track chosen URLs per video ID. Update the `blobUrl` and `pipBlobUrl` load effects to read from `selectedUrls` and depend on video ID rather than the entire video object. Update the bitrate selection handler to save the chosen URL into `selectedUrls`.
- [x] Task 3: Fix Out-of-bounds Freeze: In `syncPipVideo` in `PlayerModal.tsx`, add a condition to only set `pipPlayer.currentTime` if it differs significantly from the target boundary (`0` or `pipDur`), preventing an infinite seek loop.

# Task Dependencies
- [Task 1] can run in parallel with [Task 2] and [Task 3].