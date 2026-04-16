# 工具库（Utils）

## logger

- `createLogger({ prefix })`：生成带前缀的 Logger

## query

- `queryFromObject(obj)`：把对象转为 query string（RestClient 的 GET 使用）

## compression

- `decompressKMessage(buffer)`：解压 WebSocket 压缩消息（compress=1 时 server->client）

## message queue / task queue

- `KMessageQueue`：按 sn 缓冲乱序事件并按序释放
- `TaskQueue`：控制并发/顺序的异步队列
- `PriorityQueue`：底层堆结构

## content helpers

- `extractContent(event)`：从 KMarkdown 等消息中提取“更适合做指令解析”的文本
- `isExplicitlyMentioningBot(event, botId?)`：判断是否明确 @ 机器人
- `removingKMarkdownLabels(text)`：去除 KMarkdown 标签的简化处理

