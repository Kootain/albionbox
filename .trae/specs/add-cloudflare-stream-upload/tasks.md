# Tasks
- [x] Task 1: Install Dependencies: Install `tus-js-client` in `apps/replay`.
- [x] Task 2: Create Uploader Abstraction: Define an interface/type `VideoUploader` and extract the existing Volcengine `TTUploader` logic into a separate `createVolcengineUploader` module or function.
- [x] Task 3: Implement Cloudflare Uploader: Create `createCloudflareUploader` using `tus-js-client`. Handle `onProgress`, `onError`, `onSuccess`, and `onAfterResponse` (to extract the `stream-media-id` header).
- [x] Task 4: Integrate Provider Selection: Update `useUploadQueue.tsx` to read `VITE_UPLOAD_PROVIDER` from `import.meta.env` and instantiate the appropriate uploader. Ensure progress reporting and speed calculation work correctly with the unified interface.
- [x] Task 5: Environment Variables: Add `VITE_UPLOAD_PROVIDER`, `VITE_CLOUDFLARE_ACCOUNT_ID`, and `VITE_CLOUDFLARE_API_TOKEN` to the `.env.example` file (or document them if no example file exists).

# Task Dependencies
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2] and [Task 3]