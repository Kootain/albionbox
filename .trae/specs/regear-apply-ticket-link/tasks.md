# Tasks

- [x] Task 1: Add `regearTicketId` field to `regear_applies` table
  - [x] SubTask 1.1: Edit `packages/db/src/schema/regear_apply.ts`, add `regearTicketId: text('regear_ticket_id')`.
  - [x] SubTask 1.2: Edit `packages/shared/src/schemas/regear_apply.ts`, add `regearTicketId: z.string().optional()` to `RegearApplySchema`.
- [x] Task 2: Update Regear creation schema
  - [x] SubTask 2.1: Edit `packages/shared/src/schemas/regear.ts`, add `applies: z.record(z.string(), z.string()).optional()` to `CreateRegearTicketSchema`.
- [x] Task 3: Implement linking logic in `apps/api/src/modules/regear/router.ts`
  - [x] SubTask 3.1: In `createTicketHandler`, retrieve `applies` from the validated JSON payload.
  - [x] SubTask 3.2: Iterate through the newly created `regears` and collect `applyIds` to update.
  - [x] SubTask 3.3: Execute a database update on `regear_applies` setting `regearId` and `regearTicketId` for the provided `applyIds`. Wait, because each apply has a different `regearId`, we need to do this efficiently (e.g. iterate and update, or chunked updates). Ensure `status` is updated to `ApplyStatus.PENDING_AUDIT` or the appropriate status.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
