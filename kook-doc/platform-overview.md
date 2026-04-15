# 平台概览

官方入口：https://developer.kookapp.cn/doc/intro

## 能力组件

- 事件入口：Webhook / WebSocket（互斥）
- 消息体系：KMarkdown（type=9）、CardMessage（type=10）、以及图片/文件/视频/音频等资源消息
- HTTP API：按资源域提供 bot 的管理与发消息能力
- OAuth2：面向“用户登录/绑定”类场景（不是 botToken）
- 治理能力：Rate Limit、消息配额、风控封禁

## 名词表（最常用）

- Guild：服务器
- Channel：频道（文本/语音等）
- Message：频道消息/私聊消息
- Event：通过 Webhook/WS 推送的 `s=0` 数据包
- sn：事件序号（去重、顺序、resume 的核心）
- BotToken：调用 HTTP API / WebSocket 鉴权使用
- VerifyToken：Webhook 来源校验使用

