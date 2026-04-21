# Optimize PiP Experience Spec

## Why
Currently, the Picture-in-Picture (PiP) functionality has a few UX issues:
1. The PiP video might not always be automatically muted, leading to overlapping audio.
2. The user's selected bitrate/resolution is lost when swapping the main and PiP views or updating video metadata (e.g., adding a comment).
3. The video player freezes or hangs when the PiP video's absolute timeline is out of bounds (before its start or after its end).

## What Changes
- Enforce `muted = true` for the PiP player and sync `muted` state for the main player based on the current volume, especially after POV swaps.
- Persist the selected resolution (bitrate URL) per video ID using a `selectedUrls` state map so that POV swaps and video updates do not reset the player to the default URL.
- Prevent infinite seek loops in `syncPipVideo` by checking the current time before forcing the PiP player to seek to `0` or `duration` when out of bounds.

## Impact
- Affected code:
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## MODIFIED Requirements
### Requirement: PiP Audio Muting
The system SHALL ensure the PiP video is completely muted at all times, and only the main video plays audio according to the user's volume setting.

### Requirement: Bitrate Persistence
The system SHALL persist the user's selected bitrate/resolution for a video, even when the video is swapped between the main and PiP views or when video metadata is updated.

### Requirement: Out-of-bounds Timeline Handling
The system SHALL NOT freeze when the PiP video is out of bounds. It MUST only seek the PiP video once to the boundary (start or end) instead of repeatedly seeking on every time update.