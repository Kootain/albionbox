# Tasks

- [x] Task 1: Implement Kook guild members API in `apps/api`
  - [x] Add `listGuildUsersHandler` to `apps/api/src/modules/kook/router.ts` using `kookGet(c, '/guild/user-list', { guild_id: guildId })`
  - [x] Mount the handler at `.get('/guilds/:guildId/users', ...listGuildUsersHandler)`

- [x] Task 2: Update Regear Approval Tab Timezone Display
  - [x] In `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`, update `timeFormat` state logic to show `Intl.DateTimeFormat().resolvedOptions().timeZone` when toggled away from `UTC`.

- [x] Task 3: Update Kook API calls in Frontend
  - [x] Update the `fetchKookData` effect to use `(api as any).kook.guilds[':guildId'].channels.$get({ param: { guildId } })` instead of the broken query syntax.
  - [x] Update the `fetchKookData` effect to use `(api as any).kook.guilds[':guildId'].users.$get({ param: { guildId } })` instead of the broken query syntax.

- [x] Task 4: Refactor Death Details Modal to Fetch Real Data
  - [x] In `RegearApprovalTab.tsx`, update `handleShowDeathDetails` to accept `row: RegearApply`.
  - [x] If `row.eventId` is missing, show an error toast.
  - [x] Otherwise, set a loading state and call `api.guilds.test.albion.events[':id'].$get({ param: { id: row.eventId } })`.
  - [x] Upon success, call `setSelectedDeathRecord` with the response data.

- [x] Task 5: Add Apply Record (Image) Button
  - [x] In the action column of `RegearApprovalTab.tsx`, add an image icon button.
  - [x] On click, parse `row.applyMeta` and `window.open(meta.imageUrl, '_blank')` if available.
