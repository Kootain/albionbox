# 控制台与 Token

开发者后台：https://developer.kookapp.cn/bot

## Token 分类与用途

- Bot Token
  - 用途：HTTP API `Authorization: Bot <token>`、WebSocket 网关连接
  - 风险：泄露会导致 bot 被完全控制，应只存储为密钥，不写入代码库
- Verify Token
  - 用途：Webhook 请求体里 `d.verify_token`，用于校验来源是否来自 KOOK
  - 特点：不会用于 HTTP API
- Encrypt Key（可选）
  - 用途：Webhook 加密消息解密（aes-256-cbc）
  - 特点：启用后 KOOK 可能仍会在加密后的消息上再做一次 `zlib(deflate)` 压缩

## 连接模式互斥

- 选择 Webhook 后不能再用 WebSocket 收事件
- 选择 WebSocket 后平台不会再向回调地址推送事件

## 最小化配置建议

- dev 环境先不开启加密与压缩（CallbackUrl 加 `compress=0`），把事件跑通
- 上线后启用加密（Encrypt Key）与 sn 去重（KV/DB）

