# Message（频道消息）

官方接口列表：https://developer.kookapp.cn/doc/http/message

## 常用能力

- 列表与详情：list/view
- 发送/更新/删除：create/update/delete
- Reaction：reaction-list/add-reaction/delete-reaction
- Pin：pin/unpin
- Pipe：send-pipemsg

## 典型接口

- `GET /api/v3/message/list`
- `GET /api/v3/message/view`
- `POST /api/v3/message/create`
- `POST /api/v3/message/update`
- `POST /api/v3/message/delete`
- `GET /api/v3/message/reaction-list`
- `POST /api/v3/message/add-reaction`
- `POST /api/v3/message/delete-reaction`
- `POST /api/v3/message/pin`
- `POST /api/v3/message/unpin`

## 发送消息关键参数

- `type`：默认 9（KMarkdown），10 为 CardMessage
- `target_id`：频道 id
- `content`：文本/URL/卡片 JSON 字符串
- `quote`：回复 msg_id
- `nonce`：随机串（服务端原样返回）
- `temp_target_id`：临时消息，不入库，不占配额

## 风控与配额

- 强烈建议过滤机器人自己的消息再做回复，避免循环刷屏导致封禁
- 配额规则见：[消息配额](file:///Users/kootain/Code/github.com/Kootain/albionbox/kook-doc/message-quota.md)

