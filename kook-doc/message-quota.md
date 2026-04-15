# 消息配额

官方说明入口（消息接口页内）：https://developer.kookapp.cn/doc/http/message#%E6%B6%88%E6%81%AF%E9%85%8D%E9%A2%9D%E8%AF%B4%E6%98%8E

## 规则摘要

- 配额维度：开发者账号维度（一个账号下所有机器人共享）
- 单日上限：10,000 条
- 重置时间：北京时间（UTC+8）中午 12:00
- 失败请求不计入配额

## 计入配额的接口（当前文档列出）

- `/api/v3/message/create`
- `/api/v3/message/update`
- `/api/v3/direct-message/create`
- `/api/v3/direct-message/update`
- `/api/v3/thread/create`
- `/api/v3/thread/reply`

## 不计入配额

- 临时消息（temp_target_id）

## 工程建议

- 过滤机器人自己的消息再做自动回复，避免循环刷屏导致封禁
- 对高频通知尽量用“更新消息”替代“重复发送”

