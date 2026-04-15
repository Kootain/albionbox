# 消息类型

官方文档：

- 事件 type 说明：https://developer.kookapp.cn/doc/event/event-introduction
- HTTP 消息接口：https://developer.kookapp.cn/doc/http/message

## 常用 type

- 1：文字消息
- 2：图片消息（content 为 URL）
- 3：视频消息（content 为 URL）
- 4：文件消息（content 为 URL）
- 8：音频消息（content 为 URL）
- 9：KMarkdown（推荐默认）
- 10：CardMessage（结构化消息，content 为 JSON 字符串）
- 255：系统消息（extra.type + extra.body）

## 发送消息（HTTP）

接口：`POST /api/v3/message/create`

关键参数（简化）：

- `type` 不传默认 9
- `target_id` 目标频道
- `content` 文本 / URL / 卡片 JSON 字符串
- `quote` 回复某条消息
- `nonce` 幂等用随机串（平台原样返回）
- `temp_target_id` 临时消息（不入库，只对该用户可见，不占配额）

