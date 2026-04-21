# Tasks
- [x] Task 1: Force Muted State on VePlayer: In `VolcPlayer.tsx`, listen to the `ready` event of `playerSdk` and explicitly set `playerSdk.player.muted = true` and `volume = 0` if the `muted` prop is true. Also add `autoplayMuted: muted` to the configuration.
- [x] Task 2: Track Main Player Buffering State: In `VolcPlayer.tsx`, expose `onWaiting` and `onPlaying` props and bind them to the VePlayer instance. In `PlayerModal.tsx`, add a ref `isMainBufferingRef` and handle these events on the main `<Stream>` and `<VolcPlayer>` components.
- [x] Task 3: Refactor `syncPipVideo` Logic: In `PlayerModal.tsx`, update `syncPipVideo` to:
  - Remove all `opacity: 0.3` manipulations.
  - Pause PiP video if `pipTargetTime` is out of bounds (`< 0` or `> pipDur`), seeking it to `0` or `pipDur` respectively.
  - If in bounds, seek only if the time difference is `> 0.5s`.
  - Play PiP video ONLY if `!mainPlayer.paused` and `!isMainBufferingRef.current`. Pause it otherwise.
- [x] Task 4: Fix Manual PiP Controls: In `PlayerModal.tsx`, update `togglePlay` to only manipulate the `mainPlayer` and call `setTimeout(syncPipVideo, 10)` to let the robust sync logic handle the PiP player's state.

# Task Dependencies
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]