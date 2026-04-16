# WebSocket

官方文档：https://developer.kookapp.cn/doc/websocket

## 关键特性

- Gateway 需要先通过 HTTP API 获取：https://developer.kookapp.cn/doc/http/gateway
- `compress=1` 时，server->client 为 deflate 压缩后的 binary
- 客户端需按 `sn` 顺序处理，乱序需要 buffer，重复 sn 直接丢弃
- 断线恢复：resume 需要在 gateway url 上拼接 `resume=1&sn=<lastSn>&session_id=<lastSessionId>`

## 连接流程要点（官方建议）

- 获取 gateway 失败：指数退避（2, 4），最多两次后进入更长退避
- 连接后 6s 内必须收到 HELLO（s=1）
- 心跳：约每 30s（带抖动）发送 PING（s=2），6s 内未收到 PONG（s=3）视为超时
- RECONNECT（s=5）：必须清空 sn 与消息队列，并重新获取 gateway 重新连接

## 信令（KMessageKinds）

- s=0 EVENT
- s=1 HELLO（包含 session_id）
- s=2 PING（客户端带 sn）
- s=3 PONG
- s=4 RESUME
- s=5 RECONNECT
- s=6 RESUME ACK

