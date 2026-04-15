# WsClient

定位：WebSocket 连接管理器，内部实现为有限状态机，尽量对齐官方连接流程。

## 关键能力

- 通过 `RestClient.openGateway()` 获取 gateway url
- 支持 `compress=1` 的 deflate 解压（依赖 `decompressKMessage`）
- 心跳：定时发送 PING（带 lastSn），超时后进入重连/恢复流程
- Resume：断线后通过 gateway url 拼接 resume 参数进行恢复
- sn 顺序：检测乱序后进入队列缓冲，满足严格递增后再批量刷新
- RECONNECT：收到后清空 sn、session、队列并从头重新连接

## 事件模型（SDK 对外）

- `event(event, sn?)`：全部事件
- `systemEvent(event, sn?)`：`evt.type === KEventTypes.System`
- `textChannelEvent(event, sn?)`：其他事件
- `reset`：收到 RECONNECT 或内部需要清空状态时触发
- `stateChange(newState, oldState)`：状态机变更

## 工程注意点

- `autoReconnect` 只在不处于“opening gateway”相关状态时触发，避免重复重连风暴
- `compression` 开启时，`onmessage` 需要把 binary 解压再 JSON.parse

