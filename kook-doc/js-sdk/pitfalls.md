# 常见坑位

## Webhook / WebSocket 模式互斥

- 控制台选择 Webhook 后，WebSocket 不会再收到事件；反之亦然

## Webhook 压缩与加密叠加

- 未设置 `compress=0` 时，请求体可能是 deflate 二进制
- 启用加密后，请求体解压后通常为 `{ "encrypt": "..." }`
- 平台可能对“已加密消息”再次做 deflate 压缩

## sn 去重与顺序

- Webhook：失败重试会导致重复 sn，必须做幂等
- WebSocket：乱序需要 buffer，重复 sn 应丢弃

## 机器人自言自语

- 机器人消息再触发机器人监听会形成刷屏循环，容易触发配额与封禁

## CardMessage 的 content 是字符串

- HTTP API `content` 必须是 JSON 序列化后的字符串，而不是对象

