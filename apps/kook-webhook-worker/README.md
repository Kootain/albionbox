## KOOK Webhook Worker

### 路由

- `POST /kook/webhook`
- `GET /health`

### 环境变量

- `KOOK_VERIFY_TOKEN` 必填
- `KOOK_ENCRYPT_KEY` 可选（启用 Webhook 消息加密时必填）
- `KV` 可选（用于 `sn` 去重）

### 行为

- 自动识别 `zlib (deflate)` 压缩请求体并解压
- 自动识别 `{ "encrypt": "..." }` 并按 KOOK 规则解密
- 校验 `d.verify_token`
- `challenge` 验证请求返回 `{ "challenge": "..." }`
- 事件请求快速返回 200，并用 `waitUntil` 异步处理

