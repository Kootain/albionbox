# Tasks

- [x] Task 1: 实现火山 OpenAPI 签名与请求辅助函数
  - [x] SubTask 1.1: 在 `apps/api/src/lib/volcengine.ts` (或 `apps/api/src/modules/replay/volcengine.ts`) 中，实现基于 AK/SK 的 API 签名机制，以满足在 Cloudflare Workers 中发起 `GetPlayInfo` 调用的需求（使用 HMAC-SHA256 签名 `vod.volcengineapi.com`）。
  - [x] SubTask 1.2: 如果自己手写签名过于复杂，检查并尝试通过官方 `volcengine-openapi` (或 `volcengine-sdk-nodejs` 在 Edge 环境下的兼容版本) 来实现 `GetPlayInfo` 请求。如果由于 Node 依赖不兼容，必须手写 fetch + 签名计算。

- [x] Task 2: 改造 `GET /replay` 路由
  - [x] SubTask 2.1: 在 `apps/api/src/modules/replay/router.ts` 中，获取 `c.env.VOLC_ACCESS_KEY_ID` 和 `c.env.VOLC_SECRET_ACCESS_KEY` 环境变量。
  - [x] SubTask 2.2: 在 `getVideosHandler` 获取完 `videos` 列表后，利用 `Promise.all` 对所有拥有 `vid` 的视频请求对应的 `GetPlayInfo`。
  - [x] SubTask 2.3: 解析 `PlayInfoList`，提取 `MainPlayUrl`（或带有效期的动态 URL），赋值给返回列表元素的 `videoUrl`。

- [x] Task 3: 清理前端回退逻辑
  - [x] SubTask 3.1: 在 `apps/replay-v2/src/components/modals/PlayerModal.tsx` 中，删除利用 `vid` 拼接 `volc-auth-worker.kootain.workers.dev` 作为 `blobUrl` 的降级逻辑，只依赖 `mainVideo.videoUrl`。
  - [x] SubTask 3.2: 运行类型检查，确保 `videoUrl` 在 `VideoRecord` 中是被正确消费的。

# Task Dependencies
- Task 2 依赖于 Task 1 的火山引擎鉴权打通。
- Task 3 依赖于后端返回的数据结构生效。