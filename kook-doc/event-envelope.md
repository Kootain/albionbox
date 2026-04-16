# 事件格式（s=0）

官方文档：https://developer.kookapp.cn/doc/event/event-introduction

## 外层结构

```json
{
  "s": 0,
  "d": {},
  "sn": 1000
}
```

- s：信令类型，事件固定为 0
- d：事件数据
- sn：事件序号（Webhook 一定会有；WebSocket 的 s=0 也会有）

## 事件核心字段（d）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| channel_type | string | `GROUP` 组播、`PERSON` 单播、`BROADCAST` 广播 |
| type | number | 1文字、2图片、3视频、4文件、8音频、9KMarkdown、10Card、255系统消息 |
| target_id | string | 频道消息为 channel_id；系统组播消息可能为 guild_id |
| author_id | string | 发送者 id，`1` 代表系统 |
| content | string | 文本为内容，资源消息为 URL，CardMessage 为 JSON 字符串 |
| msg_id | string | 消息 id |
| msg_timestamp | number | 毫秒时间戳 |
| nonce | string | 与发送消息 API 的 nonce 对应 |
| extra | any | 按 type/channel_type 不同而变化 |

