# JS SDK 概览（@kookapp/js-sdk / kaiheila/js-bot）

仓库：https://github.com/kaiheila/js-bot  
包名：`@kookapp/js-sdk`

## SDK 能力地图

- WebSocket：网关获取、压缩解压、心跳、断线重连、resume、sn 顺序队列
- HTTP API：资源域方法封装 + `request()` 原始调用
- Rate Limit：从响应头提取并做桶级与全局限速
- 消息构建：CardBuilder（链式构建卡片 JSON 字符串）
- 指令系统：DirectiveRegistry + DirectiveDispatcher
- 插件系统：PluginLoader + 生命周期钩子
- 工具库：logger、query、compression、message queue、task queue 等

## 设计取向

- no-throw：HTTP API 返回统一 `{ success, code, message, data }` 结构，失败一般不抛异常
- 单入口：`KookClient` 聚合 ws/api/指令/插件

## 本项目用法

- 参考 [KookProvider](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/bot/src/providers/kook/kook.provider.ts)

