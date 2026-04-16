# 补装图识别 Consumer Spec

## Why
当前补装（regear）申请需要人工录入击杀截图信息。新增一个在 KOOK 事件流中自动识别“补装图”的 consumer，可自动从图片/卡片中提取截图并解析结构化字段，进而自动创建 `regear_apply` 申请，提高效率与一致性。

## What Changes
- 在 `kook-consumer-worker` 增加一个新的 consumer：补装图识别 consumer（consumer_id 由代码固定）。
- 支持从 KOOK 消息事件中提取候选图片 URL：
  - `type=2`：`d.content` 为图片 URL
  - `type=10`：`d.content` 为 CardMessage JSON 字符串，遍历所有 card/modules，遇到 `module.type === "container"` 时提取其 `elements[].src` 中的图片 URL
  - `type=1`/`type=9`：本期只做“可接收但不解析图片”，用于后续扩展（不做图片提取）
- 对每张候选图片调用图像识别组件（位于 `packages/`）得到结构化识别结果。
- 若识别结果关键字段为空则跳过；否则调用 `apps/api` 的 `regear_apply` 创建申请。
- `apps/api` 增加一个“内部鉴权”路径，允许 consumer-worker 以内部 token 调用 `regear_apply` 创建申请（不依赖用户 session token）。

## Impact
- Affected specs: KOOK consumer 业务消费、图像识别、regear_apply 申请创建链路
- Affected code:
  - `apps/kook-consumer-worker/src/consumer.ts`（注册新 consumer）
  - `apps/api/src/modules/regear_apply/router.ts`（支持内部鉴权创建）
  - `packages/shared/src/utils/api_image.ts`（复用/抽象图像识别调用；若未来拆 `packages/image_ai` 另开 spec）

## ADDED Requirements
### Requirement: Regear Image Recognition Consumer
系统 SHALL 提供一个补装图识别 consumer，用于从 KOOK 事件中提取截图并创建补装申请。

#### Scenario: Image message (type=2)
- **WHEN** consumer 收到 `d.type = 2` 的事件
- **THEN** 将 `d.content` 视为图片 URL 进入识别流程

#### Scenario: Card message (type=10)
- **WHEN** consumer 收到 `d.type = 10` 的事件
- **THEN** 将 `d.content` JSON.parse 为卡片数组，遍历所有卡片的 `modules`
- **AND** 当 `module.type === "container"` 时，遍历其 `elements` 收集所有 `type === "image"` 且 `src` 非空的 URL

#### Scenario: Recognition result is invalid
- **WHEN** 图像识别输出中关键字段为空（至少包含 victimName 或 timestamp 为空）
- **THEN** 跳过该图片，不创建申请

#### Scenario: Recognition result is valid
- **WHEN** 图像识别输出中关键字段满足要求
- **THEN** consumer 调用 `apps/api` 的 `POST /regear_applies` 创建一条申请，并携带：
  - `msgId` = KOOK `d.msg_id`
  - `msgUserid`/`msgUsername` = `d.extra.author.id`/`d.extra.author.username`（若存在）
  - `msgGuild` = `d.extra.guild_id`（若存在）
  - `msgChannel` = `d.target_id`
  - `applyDetail` = 识别结果结构（符合 `ApplyDetailSchema`）

### Requirement: Internal API Auth for Regear Apply
系统 SHALL 支持 consumer-worker 以内部 token 调用 `regear_apply` 创建申请。

#### Scenario: Internal auth success
- **WHEN** 请求携带 `Authorization: Bearer <INTERNAL_API_TOKEN>`
- **THEN** 允许调用 `POST /regear_applies`

#### Scenario: Internal auth failure
- **WHEN** token 缺失或不匹配
- **THEN** 返回 401

## MODIFIED Requirements
### Requirement: Existing KOOK Consumer Dispatch
补装图识别 consumer SHALL 通过现有的 KV filter 机制启用消费；默认不消费任何事件，只有为该 consumer_id 配置 filter 后才会被触发。

