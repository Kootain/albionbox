# Add regear_ticket_id to Regear Apply and Link on Ticket Creation

## Why
When creating a regear ticket from a battle event, some players may have already submitted a regear apply via third-party integrations (e.g. Discord, KOOK). We need to associate these existing applies with the newly created regear records and the overall ticket, so their statuses can be correctly updated and tracked.

## What Changes
- Add `regearTicketId` field to the `regear_applies` table in `@albionbox/db`.
- Update the `RegearApplySchema` in `@albionbox/shared` to include `regearTicketId`.
- Add an `applies` field (mapping `eventId` to `applyId`) to `CreateRegearTicketSchema`.
- In `createTicketHandler` (apps/api/src/modules/regear/router.ts), when creating regear records, if an `applyId` is provided for an `eventId`, update the corresponding `regear_applies` record with the new `regearId` and `regearTicketId`.

## Impact
- Affected specs: Regear management flow, Apply flow.
- Affected code:
  - `packages/db/src/schema/regear_apply.ts`
  - `packages/shared/src/schemas/regear_apply.ts`
  - `packages/shared/src/schemas/regear.ts`
  - `apps/api/src/modules/regear/router.ts`

## ADDED Requirements
### Requirement: Link Regear Apply on Ticket Creation
When a guild manager creates a regear ticket, the system SHALL accept a mapping of `eventId` to `applyId`. For any provided `applyId`, the system MUST update the corresponding `regear_apply` record with the newly created `regear_id` and the `ticket_id`, linking them together.
