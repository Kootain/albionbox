# KOOK 平台 & JS SDK 调研报告

## 调研范围
- KOOK 开发文档 Intro：https://developer.kookapp.cn/doc/intro
- KOOK Bot/开放平台文档仓库（文档源码）：https://github.com/kaiheila/api-docs
- KOOK JS SDK（`kaiheila/js-bot`，当前内容为 `@kookapp/js-sdk`）：https://github.com/kaiheila/js-bot

## KOOK 平台能力（官方文档）

### 接入形态（两种收事件方式，互斥）
- WebSocket（长连接实时事件流，含重连/续传/心跳/压缩等协议要求）：https://developer.kookapp.cn/doc/websocket
- Webhook（HTTP 回调推事件，含 challenge 校验、重试策略、压缩与可选加密）：https://developer.kookapp.cn/doc/webhook

### HTTP API 能力（按资源分类的能力面）
- API 资源导航入口（HTTP 页面顶部导航区可跳转各模块）：https://developer.kookapp.cn/doc/http/message
- 服务器（Guild）接口列表：https://developer.kookapp.cn/doc/http/guild
- 频道（Channel）接口列表：https://developer.kookapp.cn/doc/http/channel
- 频道消息（Message）接口列表：https://developer.kookapp.cn/doc/http/message
- 频道用户（Channel User）接口列表：https://developer.kookapp.cn/doc/http/channel-user
- 私聊会话（User Chat）接口列表：https://developer.kookapp.cn/doc/http/user-chat
- 私聊消息（Direct Message）接口列表：https://developer.kookapp.cn/doc/http/direct-message
- Gateway（获取网关连接地址等）：https://developer.kookapp.cn/doc/http/gateway
- 用户接口列表：https://developer.kookapp.cn/doc/http/user
- 语音接口列表：https://developer.kookapp.cn/doc/http/voice
- 媒体/资源上传（asset）：https://developer.kookapp.cn/doc/http/asset
- 服务器角色（guild-role）：https://developer.kookapp.cn/doc/http/guild-role
- 亲密度（intimacy）：https://developer.kookapp.cn/doc/http/intimacy
- 服务器表情（guild-emoji）：https://developer.kookapp.cn/doc/http/guild-emoji
- 邀请（invite）：https://developer.kookapp.cn/doc/http/invite
- 黑名单（blacklist）：https://developer.kookapp.cn/doc/http/blacklist
- Badge：https://developer.kookapp.cn/doc/http/badge
- 在玩状态（game）：https://developer.kookapp.cn/doc/http/game
- 帖子（thread）：https://developer.kookapp.cn/doc/http/thread
- OAuth2（HTTP OAuth 接口列表）：https://developer.kookapp.cn/doc/http/oauth

### 消息体系（类型、结构、富文本/卡片）
- 事件结构（Webhook/WebSocket 收到的 `s=0` 事件统一结构、字段含义）：https://developer.kookapp.cn/doc/event/event-introduction
- 事件主要格式（`channel_type/type/target_id/author_id/content/msg_id/extra` 等字段）：https://developer.kookapp.cn/doc/event/event-introduction#%E4%BA%8B%E4%BB%B6%E4%B8%BB%E8%A6%81%E6%A0%BC%E5%BC%8F
- KMarkdown（type=9，语法、提及格式、示例、工具）：https://developer.kookapp.cn/doc/kmarkdown
- CardMessage（type=10，结构化消息；模块/元素/结构体；按钮等交互）：https://developer.kookapp.cn/doc/cardmessage
- 消息相关接口（含 create/update/delete/reaction/pin 等能力入口）：https://developer.kookapp.cn/doc/http/message

### 速率与配额（工程上必须处理）
- HTTP Rate Limit（响应头字段、429 语义、封禁风险）：https://developer.kookapp.cn/doc/rate-limit
- 消息配额（每日上限、计费接口清单、临时消息/折扣规则等）：https://developer.kookapp.cn/doc/http/message#%E6%B6%88%E6%81%AF%E9%85%8D%E9%A2%9D%E8%AF%B4%E6%98%8E

### 安全/校验与加密
- Webhook Challenge、`verify_token` 校验、压缩 `compress=0`、加密 `encrypt_key` 与解密流程：https://developer.kookapp.cn/doc/webhook
- WebSocket 协议提示（仅依赖文档字段、压缩、sn 顺序、buffer、resume、reconnect 等）：https://developer.kookapp.cn/doc/websocket
- Gateway 获取与重连参数拼接说明：https://developer.kookapp.cn/doc/http/gateway

### 事件能力面（按事件域拆分）
事件列表按域拆分（频道/私聊/成员/角色/服务器/消息/用户等），入口页面可跳转：
- 事件结构/格式说明（总入口）：https://developer.kookapp.cn/doc/event/event-introduction

## KOOK JS SDK（kaiheila/js-bot → @kookapp/js-sdk）能力与特性

### 定位与核心卖点
该仓库提供一体化 SDK：WebSocket 连接管理、REST API client、卡片消息构建、指令系统、插件系统等：
- 仓库首页/README：https://github.com/kaiheila/js-bot

### 核心模块
- `KookClient`：统一封装 WebSocket、REST、指令与插件；支持压缩、自动重连、心跳配置与事件监听： https://github.com/kaiheila/js-bot
- `RestClient`：HTTP API 封装（强调自动 rate limiting）；返回结构 `success/code/message/data`，并采用 no-throw（不抛异常）设计： https://github.com/kaiheila/js-bot
- `CardBuilder`：链式构造 CardMessage（header/section/image/button/countdown 等），并提供 build/serializedLength/snapshot 等： https://github.com/kaiheila/js-bot

### 指令与权限（更贴近机器人业务开发）
- Directive System：注册类似 `/command parameter` 的触发规则，配合 dispatcher 做权限判定与拒绝回执策略： https://github.com/kaiheila/js-bot

### 插件系统（功能模块化）
- Plugin System：支持 onLoad/onUnload/onReset/onEvent/onTextChannelEvent/onSystemEvent 等生命周期钩子： https://github.com/kaiheila/js-bot

### 类型与工具（工程化配套）
- Types：事件/用户/角色/消息创建参数/WS 状态等类型导出与常量对象（ChannelTypes/KEventTypes/KMessageKinds/KWSStates 等）： https://github.com/kaiheila/js-bot
- Utilities：事件顺序队列、解压、指令解析、提及判断、kmarkdown 文本提取等工具： https://github.com/kaiheila/js-bot

### 运行时与错误处理策略
- Requirements（Node/TS 版本要求）与 no-throw 错误处理策略说明： https://github.com/kaiheila/js-bot

## 参数细节索引（只给链接）
- WebSocket：信令格式、HELLO/EVENT/PING/PONG/RESUME/RECONNECT/RESUME ACK、sn/buffer/resume：https://developer.kookapp.cn/doc/websocket
- Webhook：Callback 配置、Challenge、重试机制、压缩与加密解密：https://developer.kookapp.cn/doc/webhook
- Gateway：`/api/v3/gateway/index`、`compress` 参数、resume 拼接：https://developer.kookapp.cn/doc/http/gateway
- 事件字段（统一结构与 extra 说明）：https://developer.kookapp.cn/doc/event/event-introduction
- 发送频道消息参数（`type/target_id/content/quote/nonce/temp_target_id/template_id/reply_msg_id` 等入口）：https://developer.kookapp.cn/doc/http/message#%E5%8F%91%E9%80%81%E9%A2%91%E9%81%93%E8%81%8A%E5%A4%A9%E6%B6%88%E6%81%AF
- Rate limit 响应头（`X-Rate-Limit-*` 与 429）：https://developer.kookapp.cn/doc/rate-limit
- KMarkdown / CardMessage 语法与结构：https://developer.kookapp.cn/doc/kmarkdown 、https://developer.kookapp.cn/doc/cardmessage

