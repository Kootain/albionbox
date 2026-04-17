# Enhance Regear Approval Page Spec

## Why
Users need clearer timezone indications, Kook guild member resolution for better readability, actual battle event data in the death details modal for accuracy, and quick access to the original application image for verification.

## What Changes
- **Timezone Display**: Replaced "Local" with the actual local timezone string (e.g., `Asia/Shanghai`) in the time column header.
- **Kook Users API**: Implemented a new endpoint in `apps/api`'s Kook module to fetch guild members, so the frontend can resolve Kook user IDs to actual usernames.
- **Death Details Query**: Updated the death details modal to fetch real `AlbionOfficialEvent` data using the `eventId` instead of displaying mock data.
- **Apply Record Image**: Added a new action button in the apply list to open the `imageUrl` from `applyMeta` in a new browser tab.

## Impact
- Affected specs: Regear Apply Approval Tab
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`
  - `apps/api/src/modules/kook/router.ts`

## ADDED Requirements
### Requirement: Kook Guild Users API
The system SHALL provide an API endpoint to fetch the list of users in a Kook guild, allowing the frontend to resolve IDs to usernames.

#### Scenario: Success case
- **WHEN** the frontend requests `/kook/guilds/:guildId/users`
- **THEN** the API returns the Kook guild member list.

### Requirement: View Original Apply Image
The system SHALL provide a button to view the original apply image for a regear record.

#### Scenario: Success case
- **WHEN** the user clicks the image button on an apply record
- **THEN** a new browser tab opens displaying the image URL extracted from `applyMeta`.

## MODIFIED Requirements
### Requirement: Time Column Header
- **WHEN** the time format is toggled to local
- **THEN** the column header displays the actual local timezone name (e.g., `Asia/Shanghai`) instead of the generic word "Local".

### Requirement: Death Details Modal
- **WHEN** the user clicks the death details (crosshair) button
- **THEN** the system fetches the actual `AlbionOfficialEvent` data from the backend using the `eventId` and renders the modal, rather than parsing incomplete mock data from `applyDetail`.