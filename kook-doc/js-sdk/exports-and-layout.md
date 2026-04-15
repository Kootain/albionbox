# 导出与模块结构

SDK 导出入口（仓库 `src/index.ts`）把能力按以下模块分组：

- 核心：`KookClient`
- HTTP：`RestClient`、`RateLimiter`、`extractRateLimitHeader`
- WebSocket：`WsClient`、`TimerManager`、事件类型定义
- Helpers：`CardBuilder`、`StreamingCard`、content 提取
- Directive：registry/dispatcher/parser/types
- Plugin：loader/types
- Utils：logger/query/compression/priority-queue/message-queue/task-queue
- Types：事件/消息/对象/常量等类型定义

工程上建议的依赖方式：

- “业务代码”只依赖 `KookClient` + 少量 helpers
- “基础设施代码”再下沉到 `RestClient/WsClient`（用于自定义限速/重连/队列行为）

