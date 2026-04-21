# Refactor PiP Sync Logic Spec

## Why
The current Picture-in-Picture (PiP) synchronization mechanism has several edge-case flaws:
1. PiP videos do not start reliably muted (due to `VePlayer` restoring unmuted state from local storage).
2. When the PiP video's absolute timeline is out of bounds (before it starts or after it ends), the PiP video becomes permanently transparent (`opacity: 0.3`) and gets stuck.
3. When the main video enters the PiP video's valid timeline, the PiP video fails to resume playback synchronously.
4. Swapping POV when the PiP video is out of bounds causes synchronization logic to glitch.

We need a robust, state-machine-like approach to synchronize the PiP player with the main player, properly handling out-of-bounds states and buffering states without breaking the UX.

## What Changes
- **Enforce PiP Muting**: Force `muted = true` explicitly on `VePlayer`'s `ready` event, ignoring local storage cache.
- **Remove Transparency**: Remove the `opacity: 0.3` styling for out-of-bounds PiP videos so they remain fully visible (paused at the first or last frame).
- **Buffering Awareness**: Add `onWaiting` and `onPlaying` event listeners to both `VolcPlayer` and `Stream` to track the main player's buffering state (`isMainBuffering`). 
- **Robust Sync Logic**: Refactor `syncPipVideo` to:
  - Pause the PiP video immediately if it is out of bounds.
  - Automatically resume the PiP video if it re-enters the valid bounds AND the main video is actively playing (not paused and not buffering).
  - Handle POV swapping smoothly by ensuring the new main video jumps to the correct target time (or `0` if negative) and the new PiP video syncs perfectly based on the new absolute global time.

## Impact
- Affected code:
  - `apps/replay/src/components/modals/PlayerModal.tsx`
  - `apps/replay/src/components/ui/VolcPlayer.tsx`

## MODIFIED Requirements
### Requirement: PiP Audio Muting
The system SHALL guarantee that the PiP video is completely muted from initialization, regardless of previous browser cache or player SDK local storage.

### Requirement: PiP Timeline Sync
The system SHALL strictly follow the main video's playback state:
- **WHEN** PiP is out of bounds, **THEN** it pauses at the start/end frame (without transparency).
- **WHEN** PiP enters bounds while main is playing, **THEN** it automatically resumes playback.
- **WHEN** main video is buffering, **THEN** PiP pauses to prevent desynchronization.