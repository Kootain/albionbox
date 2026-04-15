# Expand KOOK Worker Spec

## Why
随着项目规模扩大，现有的单一 kook-worker 难以承载复杂的业务逻辑。为了提高系统的可靠性和可维护性，我们需要将其拆分为 Webhook 接收端和队列消费端，并提供一个灵活的事件分发机制和可视化的管理后台，以便动态配置消息过滤规则。

## What Changes
- 将现有的 `kook-worker` 拆分为两个独立的 Cloudflare Worker：`kook-webhook-worker` 和 `kook-consumer-worker`，通过 Cloudflare Queue 连接。
- 在 `kook-consumer-worker` 中实现事件分发机制，支持基于 `consumer_id` 注册消费者。
- 实现动态消息绑定，支持基于服务器 ID、频道 ID、消息类型、发送者服务器权限的过滤规则（存储在 Cloudflare KV 中）。
- 提供管理后台 API，用于配置消费者实例及其过滤规则。
- 在管理后台 API 中集成前端静态页面托管，避免额外部署 Pages。
- 封装 KOOK API 调用，为管理后台的前端配置组件提供数据支持（如获取机器人的服务器、频道、频道用户、权限等）。
- **BREAKING**: 原有 `kook-worker` 的同步处理逻辑将被异步队列取代。

## Impact
- Affected specs: 消息接收与处理流程、事件分发与过滤
- Affected code: `apps/kook-worker` (拆分为 `apps/kook-webhook-worker` 和 `apps/kook-consumer-worker`)

## ADDED Requirements
### Requirement: Webhook to Queue
The system SHALL receive KOOK webhook events, validate them, and push them to a Cloudflare Queue immediately.

#### Scenario: Success case
- **WHEN** KOOK sends a valid webhook event
- **THEN** The webhook worker validates the token, pushes the payload to the queue, and returns a 200 OK to KOOK.

### Requirement: Queue Consumer and Event Dispatcher
The system SHALL consume messages from the queue and dispatch them to registered consumers based on dynamic filter rules stored in KV.

#### Scenario: Success case
- **WHEN** a message is pulled from the queue
- **THEN** the dispatcher evaluates the message against KV filter rules. If any filter passes, the message is routed to the corresponding consumer instance.

### Requirement: Management API and Frontend
The system SHALL provide a management backend to configure consumer filters and query KOOK data.

#### Scenario: Success case
- **WHEN** an admin accesses the management frontend
- **THEN** they can view available `consumer_id`s, create new consumer instances with specific filters, and query KOOK guilds/channels to aid in configuration.
