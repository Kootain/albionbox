# Gateway

官方接口列表：https://developer.kookapp.cn/doc/http/gateway

## 作用

- 获取 WebSocket 连接地址（gateway url）
- 可携带参数控制压缩、resume 等行为

## 常用参数（见官方文档）

- `compress=1|0`
- `resume=1&sn=<lastSn>&session_id=<lastSessionId>`（断线恢复时拼到 url 上）

