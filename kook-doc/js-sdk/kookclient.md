# KookClient

定位：统一入口，组合 `RestClient`、`WsClient`、指令系统与插件系统。

## 初始化参数（常用）

- `botToken`：必填
- `baseUrl`：可选，默认 `https://www.kookapp.cn`
- `compression`：可选，WS 压缩开关（默认 true）
- `autoReconnect`：可选，WS 自动重连（默认 true）
- `timing`：可选，WS 心跳/重试时间配置
- `logger`：可选，自定义日志

## 生命周期

- `connect()`
  - 先调用 `api.getSelfUser()` 尝试获取 bot 信息并缓存到 `client.me`
  - 再调用 `ws.connect()` 建立 WebSocket 连接
- `disconnect()`
  - 卸载所有插件
  - 断开 WS

## 事件监听

`client.on(...)` 直接代理到 `WsClient`：

- `event`：所有事件
- `textChannelEvent`：非系统事件
- `systemEvent`：系统事件（type=255）
- `open/close/error/reset/stateChange`

本项目示例见 [KookProvider:start](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/bot/src/providers/kook/kook.provider.ts#L59-L123)。

