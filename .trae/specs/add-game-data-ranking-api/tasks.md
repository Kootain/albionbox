# Tasks

- [x] Task 1: Create `guild_rankings` table in `@albionbox/db`
  - [x] SubTask 1.1: Create `packages/db/src/schema/rankings.ts`.
  - [x] SubTask 1.2: Define table `guildRankings` with fields: `id` (text PK), `guildId` (text, not a foreign key, indexed), `rankingType` (text, enum, indexed), `collectedAt` (text, ISO string), `data` (text, JSON), `createdAt` (text).
  - [x] SubTask 1.3: Add compound index on `(guildId, rankingType, collectedAt)` for efficient querying.
  - [x] SubTask 1.4: Export it in `packages/db/src/schema/index.ts`.
- [x] Task 2: Create schemas in `@albionbox/shared`
  - [x] SubTask 2.1: Create `packages/shared/src/schemas/rankings.ts`.
  - [x] SubTask 2.2: Define `RankingType` enum with the specified types ("CASTLE", "CORRUPTED", etc.).
  - [x] SubTask 2.3: Define `CreateRankingSchema` for the POST API. (Includes type, collectedAt, guildId, data JSON).
  - [x] SubTask 2.4: Export in `packages/shared/src/index.ts`.
- [x] Task 3: Create API Router in `apps/api`
  - [x] SubTask 3.1: Create `apps/api/src/modules/rankings/router.ts`.
  - [x] SubTask 3.2: Implement `POST /` to create a new ranking. This route should be protected by an `apiTokenMiddleware` or similar API token validation (assuming a basic mechanism exists or needs to be implemented. If no standard api-token middleware exists, we'll create a simple one or use `authMiddleware` if applicable).
  - [x] SubTask 3.3: Implement `GET /latest?guildId=xxx` to get the single latest ranking for all types for a guild.
  - [x] SubTask 3.4: Implement `GET /:type?guildId=xxx&seconds=N` to get recent rankings of a specific type.
  - [x] SubTask 3.5: Register the router in `apps/api/src/index.ts`.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]