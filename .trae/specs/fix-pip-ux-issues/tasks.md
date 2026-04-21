# Tasks
- [x] Task 1: Disable "Click to Unmute" UI: In `VolcPlayer.tsx`, add `ignores: ['sdkUnmutePlugin']` to the `VePlayer` configuration options. Also add `keyboard: { disable: true }` when `muted` is true (or via a new prop) to disable shortcuts on PiP.
- [x] Task 2: Persist Volume State: In `PlayerModal.tsx`, initialize the `volume` state by reading from `localStorage` (e.g., `albion_player_volume`), default to `1`. Update the `setVolume` handler to save the new volume to `localStorage`.
- [x] Task 3: Disable Keyboard Shortcuts on PiP: In `VolcPlayer.tsx`, accept a `disableKeyboard` boolean prop. Pass `ignores: ['keyboard']` to `VePlayer` if `disableKeyboard` is true. Update `PlayerModal.tsx` to pass `disableKeyboard={true}` to the PiP `VolcPlayer`.
- [x] Task 4: Fix PiP Auto-Resume: In `PlayerModal.tsx`, inside `syncPipVideo`, ensure that when `isPipInBounds` transitions to true and `shouldPlay` is true, `pipPlayer.play()` is reliably called. (It may be failing because `pipPlayer.paused` is not updating correctly or the promise is rejected silently. Add a ref `isPipOutOfBoundsRef` to track state transitions and force play upon entering bounds).

# Task Dependencies
- [Task 1] and [Task 3] can be done together in `VolcPlayer.tsx`.
- [Task 2] and [Task 4] can be done in `PlayerModal.tsx`.