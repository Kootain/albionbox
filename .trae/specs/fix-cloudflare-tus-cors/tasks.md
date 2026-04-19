# Tasks
- [x] Task 1: Refactor Backend `/cloudflare-direct-upload` Endpoint: Modify the handler to return a JSON object `{ uploadUrl, streamMediaId }` with a 200 OK status instead of an empty body with a 201 Created and `Location` header. Remove the explicit OPTIONS handler and CORS override for this endpoint since it will now be a standard JSON POST request protected by `authMiddleware` under the global CORS configuration.
- [x] Task 2: Update Frontend Cloudflare Uploader Logic: In `apps/replay/src/lib/uploader.ts`, manually make a `fetch` request to `${apiUrl}/replay/cloudflare-direct-upload` with `Authorization` and TUS metadata to get the `uploadUrl` and `streamMediaId`.
- [x] Task 3: Initialize `tus.Upload` with Direct URL: Use the retrieved `uploadUrl` to initialize the `tus.Upload` instance instead of using `endpoint`. Remove the `Authorization` header from the `tus.Upload` configuration entirely so that Cloudflare doesn't reject the subsequent CORS preflight requests.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]