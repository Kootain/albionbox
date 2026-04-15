# Regear 记录关联 Battle Spec

## Why
当前创建 regear ticket 时会生成关联的 regear 记录（按 event_id），但 regear 记录缺少 battle_id，导致后续按箱子/战报维度回溯与统计困难。

## What Changes
- 在数据库 `regears` 表中新增 `battle_id` 字段（允许为空以兼容历史数据）。
- 修改创建 regear ticket API：由分别传入 `battleIds[]` 与 `eventIds[]`，变更为传入 `battleEvents: Record<battleId, eventId[]>`，确保 event 与 battle 的关联关系可被持久化。**BREAKING**
- 创建 regear ticket 时：
  - `regear_ticket_battles` 由 `battleEvents` 的 key 生成
  - `regears` 由 `battleEvents` 展开生成，并写入 `battle_id`
- 更新所有调用 `api.guilds[':guildId'].regear.tickets.$post` 的前端代码，按新结构传参。
- 前端预览数据中需保留“event 属于哪个 battle”的信息，以便在创建工单时构建 `battleEvents` 映射。

## Impact
- Affected specs: Regear 工单创建、Regear 记录追踪、补装统计/排序联动
- Affected code:
  - `packages/db/src/schema/regear.ts`
  - `packages/db/migrations/*`（新增迁移）
  - `packages/shared/src/schemas/regear.ts`
  - `apps/api/src/modules/regear/router.ts`
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`（以及所有调用点）

## ADDED Requirements
### Requirement: Regear 记录持久化 Battle 关联
系统 SHALL 在 `regears` 表中保存 `battle_id`，用于表达该条 regear 记录（event）来自哪一场 battle。

#### Scenario: 创建工单时写入 battle_id
- **WHEN** 客户端创建 regear ticket，并提供 `battleEvents`（battle_id -> event_id[]）
- **THEN** 系统为每个 event_id 创建一条 `regears` 记录，并在该记录中写入对应的 `battle_id`

### Requirement: 创建 API 支持 battleEvents 映射
系统 SHALL 在创建 regear ticket 时接收 `battleEvents: Record<string, string[]>` 结构，作为 battle 与 event 的唯一数据来源。

#### Scenario: 请求校验成功
- **WHEN** `battleEvents` 至少包含 1 个 battle_id，且每个 battle_id 对应的 event_id 数组长度 >= 1
- **THEN** API 返回 201 与 `{ ticketId }`，并完成 ticket / battles / regears 的插入

#### Scenario: 请求校验失败
- **WHEN** `battleEvents` 为空，或存在 battle_id 对应的 event_id 数组为空
- **THEN** API 返回 4xx，并且不创建任何 ticket / battles / regears 记录

## MODIFIED Requirements
### Requirement: 创建 Regear Ticket API（**BREAKING**）
原创建接口的请求体从 `{ battleIds: string[], eventIds: string[] }` 修改为 `{ battleEvents: Record<string, string[]> }`。

#### Scenario: 兼容 players 映射
- **WHEN** 客户端提供 `players: Record<eventId, playerName>`
- **THEN** 系统在创建 `regears` 记录时，仍然使用 `players[eventId]` 填充 `player_name`

## REMOVED Requirements
### Requirement: CreateRegearTicketSchema 接受 eventIds 数组
**Reason**: 无法表达 event 与 battle 的对应关系，导致 battle_id 无法持久化。
**Migration**: 客户端将 `battleIds + eventIds` 转换为 `battleEvents` 后再调用创建接口。
