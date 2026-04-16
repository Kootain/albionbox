# Regear Apply Cron 自动绑定 Spec

## Why
目前 `regear_apply` 的创建来自聊天截图识别（OCR），但缺少自动与 Albion 官方战斗事件（event/battle）关联的机制，导致需要人工查询与绑定，效率低且容易遗漏。

## What Changes
- 在 `apps/api` 增加 Cloudflare Cron Trigger（Scheduled handler），周期性执行“regear_apply 自动绑定 job”。
- 在 `apps/api` 增加 `cron` 模块，封装绑定逻辑：拉取未绑定的 apply，按 victim_guild（名称）检索工会 ID，拉取最近 battles，并并发拉取 battle events，按 victimName + timestamp 匹配，匹配成功后写回 event_id / battle_id 并推进状态。
- 在数据库 `regear_applies` 表新增 `event_id`、`battle_id` 字段（允许为空以兼容历史数据）。
- 在 `@albionbox/shared` 的 regear_apply Schema 与 `apps/api` 的 regear_apply API 输出中，适配新增字段。

## Impact
- Affected specs: 补装申请自动关联战斗事件、补装申请审核流转（从 binding -> pending_audit）
- Affected code:
  - `apps/api/src/index.ts`（挂载 scheduled handler）
  - `apps/api/wrangler.jsonc`（新增 cron triggers）
  - `apps/api/src/modules/cron/*`（新增模块）
  - `apps/api/src/modules/regear_apply/router.ts`（输出字段适配）
  - `packages/db/src/schema/regear_apply.ts`
  - `packages/db/migrations/*`（新增迁移）
  - `packages/shared/src/schemas/regear_apply.ts`

## ADDED Requirements
### Requirement: Cloudflare Cron 触发自动绑定
系统 SHALL 在 Cloudflare Workers 的 Scheduled handler 中周期性触发 regear_apply 自动绑定 job。

#### Scenario: 定时触发
- **WHEN** Cron 表达式为 `*/1 * * * *` 到达触发时间
- **THEN** Worker 执行一次自动绑定 job，并且不影响原有 HTTP API 的可用性（仍通过 `fetch` 处理请求）

### Requirement: 自动绑定 job — 输入范围
系统 SHALL 从数据库拉取“未绑定”的 regear_apply 记录作为处理输入。

#### Scenario: 未绑定筛选
- **WHEN** job 执行
- **THEN** 系统仅选择满足以下条件的记录：
  - `status = 'binding'`
  - `regear_id IS NULL`
  - `event_id IS NULL` 且 `battle_id IS NULL`

### Requirement: 自动绑定 job — Albion 官方数据拉取（ASIA）
系统 SHALL 使用 ASIA 官方 API 作为数据源（通过现有 `AlbionApiClient`），完成工会最近 battle 拉取与 events 拉取。

#### Scenario: 根据 victim guild name 获取工会 ID
- **WHEN** apply 的 `victim_guild`（名称）存在
- **THEN** 系统使用 `AlbionApiClient.search(victim_guild)` 的 `guilds[]` 结果解析工会 ID，并以“名称完全匹配（忽略大小写）优先，否则取第一条”为选择策略

#### Scenario: 拉取最近 battles 并并发拉取 events
- **WHEN** 已获得 guildId
- **THEN** 系统拉取该工会最近 battles（默认 limit=50），并对每个 battle 并发拉取 events（默认 offset=0, limit=50）

### Requirement: 自动绑定 job — 匹配规则
系统 SHALL 以 victimName + timestamp 作为匹配依据，从 events 中选出最符合的一条事件。

#### Scenario: 匹配成功
- **WHEN** 存在 event 满足：
  - `event.Victim.Name` 与 apply.victim_name 完全相等
  - apply 的 `apply_detail.timestamp`（格式 `YYYY-MM-DD HH:mm`，无时区）与 `event.TimeStamp` 的时间差在 5 分钟以内（以 UTC 解析）
- **THEN** 系统更新 apply：
  - 写入 `event_id = String(event.EventId)`
  - 写入 `battle_id = String(event.BattleId)`
  - 更新 `status = 'pending_audit'`
  - 更新 `last_status_time = now`

#### Scenario: 匹配失败
- **WHEN** 在已拉取的 battles/events 中找不到符合条件的 event
- **THEN** 系统不修改该 apply（保持 `status = 'binding'`），允许后续 cron 重试

#### Scenario: 输入数据缺失导致无法匹配
- **WHEN** apply 缺少 `victim_name` 或缺少 `apply_detail.timestamp` 或缺少 `victim_guild`
- **THEN** 系统将该 apply 更新为 `status = 'bind_failed'` 并更新 `last_status_time = now`

## MODIFIED Requirements
### Requirement: Regear Apply 数据结构包含 event/battle 关联信息
系统 SHALL 在 regear_apply 数据模型与 API 输出中包含 `event_id` 与 `battle_id`（字段允许为空）。

#### Scenario: 列表接口输出
- **WHEN** 客户端请求 `GET /regear_applies`
- **THEN** 返回 items 中包含 `eventId?: string`、`battleId?: string` 字段（当数据库为空时不返回或返回 undefined/nullable，保持当前序列化风格一致）

## REMOVED Requirements
（无）

