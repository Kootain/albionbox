# GetPlayInfo Integration Spec

## Why
目前 `apps/api` 的 `/replay/videos` 返回列表中，对于火山引擎点播的视频，只向前端返回了 `vid`。前端需要通过额外的不稳定鉴权接口转换出真正的视频播放地址。根据火山引擎 VOD 官方文档 (`GetPlayInfo`)，我们可以在后端的查询接口中，利用火山 SDK 或其 OpenAPI 直接用 `vid` 换取 `PlayUrl` (主播放地址)，并在返回列表中携带 `videoUrl`，简化前端逻辑并提升播放成功率。

## What Changes
- 在 `apps/api` 引入能够计算/签名火山引擎 Open API 的逻辑（如签名计算工具或者通过官方支持在 Cloudflare Worker 中运行的 SDK）。由于 Cloudflare Workers 存在依赖限制，通常手写 AK/SK 签名请求或使用轻量级的 `@volcengine/openapi` 实现 `GetPlayInfo` 请求是最稳妥的。
- 在 `GET /replay/videos` 接口中：
  - 遍历查询出的 `videos` 列表。
  - 对存在 `vid` 且没有其他有效 `videoUrl` 的视频，调用火山引擎的 `GetPlayInfo` OpenAPI。
  - 从 `PlayInfoList[0].MainPlayUrl` 中提取出最终的播放地址。
  - 将此地址映射为 `videoUrl` 字段附加到返回对象中。

## Impact
- Affected specs: 前端获取视频列表后无需自行根据 `vid` 拼接 worker 地址，直接使用返回的 `videoUrl` 即可。
- Affected code:
  - `apps/api/src/modules/replay/router.ts`

## ADDED Requirements
### Requirement: `GetPlayInfo` OpenAPI 调用
后端 `GET /replay/videos` 接口应具备获取火山视频实际播放链接的能力。

#### Scenario: Success case
- **WHEN** API retrieves the list of videos from the database
- **THEN** it iterates over them, calls the Volcengine `GetPlayInfo` OpenAPI using the server's AK/SK for each `vid`, and appends the resulting URL to the `videoUrl` property in the JSON response.

## MODIFIED Requirements
### Requirement: 返回值扩展
原先的返回数据只包含数据库存储的数据，现在需要在组装时追加 `videoUrl`。