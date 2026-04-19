# Tasks
- [x] Task 1: Install `@volcengine/veplayer` in `apps/replay`.
- [x] Task 2: Create `<VolcPlayer>` Component: Create `apps/replay/src/components/ui/VolcPlayer.tsx`. Implement a React wrapper using `useEffect` to instantiate `new VePlayer()` with the provided DOM node. Ensure the `VePlayer` instance is destroyed on unmount.
- [x] Task 3: Expose API in `<VolcPlayer>`: Use `useImperativeHandle` and `forwardRef` to expose a standardized API matching `<video>` (`play`, `pause`, `currentTime`, `duration`, `paused`, `volume`, `muted`).
- [x] Task 4: Map VePlayer Events: Listen to `VePlayer.Events` (`TIME_UPDATE`, `LOADED_META_DATA`, `PLAY`, `PAUSE`, `ENDED`, `SEEKED`, `CANPLAY`) and map them to the corresponding React props (`onTimeUpdate`, etc.).
- [x] Task 5: License Configuration: Add logic in `VolcPlayer.tsx` or globally to set `VePlayer.setLicenseConfig` if `import.meta.env.VITE_VEPLAYER_LICENSE_URL` exists.
- [x] Task 6: Update `PlayerModal.tsx`: Replace the native `<video>` elements with `<VolcPlayer>` for Volcengine videos (where `!isMainCloudflare` or `!isPipCloudflare`). Ensure `getMainPlayer()` and `getPipPlayer()` can interface seamlessly with `<VolcPlayer>`'s forwarded ref.
- [x] Task 7: Environment Variables: Document `VITE_VEPLAYER_LICENSE_URL` in `.env.example`.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2]
- [Task 6] depends on [Task 3] and [Task 4]