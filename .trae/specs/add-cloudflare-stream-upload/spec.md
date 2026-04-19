# Cloudflare Stream Upload Spec

## Why
The current video upload implementation is tightly coupled to Volcengine (tt-uploader). To improve flexibility, reduce vendor lock-in, and provide a more robust resumable upload experience (especially for large files and unreliable connections), we need to integrate Cloudflare Stream's `tus`-based resumable upload scheme. Both providers should coexist and be easily switchable via environment configuration.

## What Changes
- Extract the upload logic from `useUploadQueue.tsx` into a provider-agnostic abstraction.
- Implement a `VolcengineUploader` to encapsulate the existing `tt-uploader` logic.
- Implement a `CloudflareUploader` using the `tus-js-client` library to support resumable uploads to Cloudflare Stream.
- Update environment variables to include a provider switch (e.g., `VITE_UPLOAD_PROVIDER=cloudflare|volcengine`).
- Ensure progress, speed, and remaining time calculations remain functional for both providers.

## Impact
- Affected specs: Video Upload Queue
- Affected code: 
  - `apps/replay/src/hooks/useUploadQueue.tsx`
  - `apps/replay/package.json` (new dependency)

## ADDED Requirements
### Requirement: Cloudflare Stream Upload Support
The system SHALL provide a video upload provider using Cloudflare Stream via the `tus` protocol.

#### Scenario: Uploading a video with Cloudflare
- **WHEN** `VITE_UPLOAD_PROVIDER` is set to `cloudflare` and the user adds a video to the queue
- **THEN** the system uses `tus-js-client` to chunk and upload the video
- **AND** the system extracts the `stream-media-id` upon completion to save the video record
- **AND** the system correctly updates the upload progress and speed metrics in the UI.

## MODIFIED Requirements
### Requirement: Configurable Upload Provider
The system SHALL support switching upload providers at build time without modifying application code, falling back to the existing Volcengine implementation if no new provider is explicitly configured.