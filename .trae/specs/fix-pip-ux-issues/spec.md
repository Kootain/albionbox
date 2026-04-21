# Fix PiP UX Issues Spec

## Why
There are several remaining UX issues with the Picture-in-Picture (PiP) and playback logic that need to be resolved to improve the overall experience:
1. When `muted` is forced on `VePlayer`, a "Click to Unmute" (取消静音) UI overlay is shown by default. This needs to be disabled via SDK parameters.
2. The main video volume is reset to maximum (1.0) when swapping POV or opening a new video, instead of respecting a global volume state.
3. The PiP video responds to keyboard shortcuts (like `Space` to play/pause) when it shouldn't. Its state should be strictly controlled by the main video's state.
4. When the main video plays into the valid timeline of the PiP video (which was previously out of bounds), the PiP video fails to auto-play because the `timeupdate` logic doesn't correctly trigger a resume.

## What Changes
- Disable the `sdkUnmutePlugin` via the `ignores` property in `VePlayer` initialization to remove the "Click to Unmute" overlay.
- Persist volume state using `localStorage` (or global state) and initialize `volume` from this persistent state so it doesn't reset to `1` across POV swaps or component mounts.
- Prevent PiP videos from responding to keyboard shortcuts by ensuring `VolcPlayer` only attaches keyboard listeners if it's the main player, or by disabling keyboard shortcuts entirely on the PiP instance.
- Update `syncPipVideo` logic so that when the PiP video enters bounds from an out-of-bounds state, it explicitly calls `.play()` if the main video is playing.

## Impact
- Affected code:
  - `apps/replay/src/components/ui/VolcPlayer.tsx`
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## MODIFIED Requirements
### Requirement: PiP Audio Muting UI
The system SHALL NOT display the "Click to Unmute" overlay when the PiP video is muted.

### Requirement: Persistent Volume
The system SHALL remember the user's volume setting across POV swaps and video openings.

### Requirement: PiP Keyboard Shortcuts
The system SHALL ignore all keyboard shortcuts (e.g., Spacebar) on the PiP video player instance.

### Requirement: PiP Auto-Resume
The system SHALL automatically start playing the PiP video when the main video's playback timeline enters the PiP video's valid timeline.