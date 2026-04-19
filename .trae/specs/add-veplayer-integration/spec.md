# VePlayer Integration Spec

## Why
Currently, Volcengine videos are played using the native HTML5 `<video>` element. To fully leverage Volcengine's advanced playback features, telemetry, and ensure optimal performance across different browsers, we need to integrate the official Web Player SDK (`@volcengine/veplayer`). This will replace the native `<video>` element while maintaining seamless hybrid playback with Cloudflare Stream videos, including PIP synchronization and POV swapping.

## What Changes
- Install `@volcengine/veplayer` in `apps/replay`.
- Create a React wrapper component `<VolcPlayer>` that manages the lifecycle of the `VePlayer` instance.
- Expose a standardized player API via `forwardRef` (matching the HTML5 video API: `play`, `pause`, `currentTime`, `duration`, `volume`, `muted`) so that `PlayerModal.tsx`'s synchronization logic remains intact.
- Map VePlayer events (`TIME_UPDATE`, `PLAY`, `PAUSE`, `ENDED`, `LOADED_META_DATA`, `SEEKED`, `CANPLAY`) to React prop callbacks.
- Replace the native `<video>` element in `PlayerModal.tsx` with `<VolcPlayer>` for non-Cloudflare videos.
- Support `VITE_VEPLAYER_LICENSE_URL` for VePlayer license configuration (defaults to a placeholder, as `localhost` automatically passes validation).

## Impact
- Affected specs: `add-cloudflare-stream-player`
- Affected code:
  - `apps/replay/package.json`
  - `apps/replay/src/components/ui/VolcPlayer.tsx` (New)
  - `apps/replay/src/components/modals/PlayerModal.tsx`

## ADDED Requirements
### Requirement: VePlayer Integration
The system SHALL use the official VePlayer SDK for playing videos hosted on Volcengine.

#### Scenario: Success case
- **WHEN** the user opens a Volcengine-hosted video
- **THEN** the modal uses the `@volcengine/veplayer` player instead of the native `<video>` element.
- **AND WHEN** the PIP video is from Cloudflare and the main video is from Volcengine (or vice versa)
- **THEN** the progress synchronization, play/pause state, and POV switching continue to work smoothly via the unified player API interface.