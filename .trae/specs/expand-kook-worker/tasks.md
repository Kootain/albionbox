# Tasks
- [x] Task 1: Setup Workspace & Boilerplate: Rename `kook-worker` to `kook-webhook-worker`, create `kook-consumer-worker`, and configure `wrangler.jsonc` for both (Queue, KV bindings).
  - [x] SubTask 1.1: Rename existing worker directory and update package.json/wrangler.jsonc.
  - [x] SubTask 1.2: Scaffold `kook-consumer-worker` with Hono and Cloudflare Queue consumer entry point.
- [x] Task 2: Implement Webhook to Queue Logic: Update `kook-webhook-worker` to push validated events to Cloudflare Queue instead of processing them synchronously.
- [x] Task 3: Implement Consumer Event Dispatcher: Build the core dispatch logic in `kook-consumer-worker`.
  - [x] SubTask 3.1: Define Consumer interface and registration mechanism.
  - [x] SubTask 3.2: Implement filter evaluation logic (guild, channel, type, permission).
  - [x] SubTask 3.3: Fetch filter configurations from KV and route queue messages.
- [x] Task 4: Implement Management API (KOOK API Integration): Build Hono routes in `kook-consumer-worker` to fetch data from KOOK.
  - [x] SubTask 4.1: Implement endpoints for fetching bot's guilds and channels.
  - [x] SubTask 4.2: Implement endpoints for fetching channel users and permissions.
- [x] Task 5: Implement Management API (Filter Configuration): Build CRUD endpoints for consumer instance and filter rules in KV.
- [x] Task 6: Implement Management Frontend: Create a simple static frontend (HTML/JS/CSS) served directly by the `kook-consumer-worker` Hono app to manage filters and consumers.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 4] and [Task 5]
