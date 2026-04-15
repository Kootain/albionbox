# 接入模式选择

官方入口：

- Webhook：https://developer.kookapp.cn/doc/webhook
- WebSocket：https://developer.kookapp.cn/doc/websocket

## Webhook

- 优势：天然适配多实例与弹性伸缩，不需要维护长连接；高并发更友好
- 劣势：要处理 1s 内响应、重试、sn 去重、（可选）解密与解压
- 适合：Worker/Serverless、多实例后端、对稳定性要求高的机器人

## WebSocket

- 优势：实时性好，端到端链路短；SDK 通常支持开箱即用
- 劣势：需要处理心跳、断线重连、resume、sn buffer、压缩等协议细节
- 适合：单实例 bot、Node 长进程、需要低延迟的交互型机器人

