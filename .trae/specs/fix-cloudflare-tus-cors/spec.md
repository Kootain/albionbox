# Fix Cloudflare TUS CORS Error Spec

## Why
在 Cloudflare Stream 的 TUS 直传（Direct Creator Upload）过程中，前端 `tus-js-client` 在第一步成功获取到 Cloudflare 的 `Location` 上传地址后，会向该地址发起 `PATCH` 等请求进行实际的视频切片上传。由于我们在配置 `tus.Upload` 时全局注入了 `Authorization: Bearer <token>`，导致该请求携带了不被 Cloudflare TUS 节点允许的自定义鉴权头。Cloudflare 边缘节点在处理该请求的 OPTIONS 预检时，因为 `Authorization` 头部超出了其允许范围，直接拦截并报错（CORS error）。

我们需要将“获取上传凭证（需要带 Token 请求我们自己的后端）”和“实际上传数据（不带 Token 直接推给 Cloudflare）”这两个步骤在代码中解耦。

## What Changes
- **重构前端 `createCloudflareUploader` 逻辑**：
  - 手动使用 `fetch` 携带 `Authorization` 向后端 `/replay/cloudflare-direct-upload` 请求上传地址 (`Location`) 和视频 ID (`Stream-Media-Id`)。
  - 将获取到的地址作为 `uploadUrl` 参数传入 `tus.Upload`，并**移除** `tus.Upload` 配置中的 `Authorization` 请求头。
- **重构后端 `/replay/cloudflare-direct-upload` 接口**：
  - 不再使用 `201 Created` 附带 HTTP Header 的方式透传地址（这在复杂的 CORS 环境下容易丢失或被浏览器截断）。
  - 改为标准的 `200 OK`，并将 `Location` 和 `Stream-Media-Id` 放在 JSON Body 中返回。
  - 移除冗余的 OPTIONS 处理器（因为现在这是一个普通的 JSON API 请求）。

## Impact
- Affected specs: `add-cloudflare-stream-upload`
- Affected code:
  - `apps/api/src/modules/replay/router.ts`
  - `apps/replay/src/lib/uploader.ts`

## MODIFIED Requirements
### Requirement: Cloudflare Stream Upload
The system SHALL securely request a direct upload URL from the backend using the user's authentication token. The system SHALL then perform the resumable upload directly to Cloudflare without attaching the user's authentication token to the Cloudflare requests to avoid CORS rejection.

#### Scenario: Success case
- **WHEN** user initiates a Cloudflare upload
- **THEN** frontend manually fetches the upload `uploadUrl` and `streamMediaId` from the backend via a JSON POST request.
- **AND** frontend initializes `tus.Upload` with the received `uploadUrl` and without any `Authorization` headers.
- **AND** the video uploads successfully without CORS errors.