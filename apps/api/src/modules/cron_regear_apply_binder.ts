import { drizzle } from 'drizzle-orm/d1'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { ApplyStatus, AlbionServer, type AlbionOfficialBattle, type AlbionOfficialEvent } from '@albionbox/shared'
import { regearApplies } from '@albionbox/db'
import { AlbionApiClient } from '../lib/albion-sdk'
import { addKookMessageReaction, createKookRestClient } from '../lib/kook-sdk'
import { resolveAlbionGuildIdByName } from './guilds/guilds.service'

type RegearApplyRow = typeof regearApplies.$inferSelect

type BindResult =
  | { type: 'bound'; eventId: string; battleId: string }
  | { type: 'missing_fields' }
  | { type: 'no_match' }
  | { type: 'skipped' }

export async function runRegearApplyAutoBinder(
  env: Env,
  options?: { limit?: number; windowMinutes?: number; battleFetchLimit?: number; eventFetchLimit?: number }
) {
  const db = drizzle(env.DB)
  const limit = options?.limit ?? 25
  const windowMinutes = options?.windowMinutes ?? 5
  const windowMs = (options?.windowMinutes ?? 5) * 60 * 1000
  const battleFetchLimit = options?.battleFetchLimit ?? 51
  const eventFetchLimit = options?.eventFetchLimit ?? 51

  const jobStartedAt = Date.now()
  console.log(JSON.stringify({
    msg: 'regear_apply_binder_job_start',
    limit,
    windowMinutes,
    battleFetchLimit,
    eventFetchLimit,
  }))

  const applies = await db
    .select()
    .from(regearApplies)
    .where(
      and(
        eq(regearApplies.status, ApplyStatus.BINDING),
        isNull(regearApplies.regearId),
        isNull(regearApplies.eventId),
        isNull(regearApplies.battleId),
      )
    )
    .orderBy(asc(regearApplies.createTime))
    .limit(limit)
    .all()

  if (applies.length === 0) {
    console.log(JSON.stringify({ msg: 'regear_apply_binder_job_no_work', durationMs: Date.now() - jobStartedAt }))
    return { scanned: 0, updated: 0, bound: 0, bindFailed: 0 }
  }

  const client = new AlbionApiClient(AlbionServer.ASIA)
  const guildNameToIdCache = new Map<string, string | null>()
  const guildIdToBattlesCache = new Map<string, AlbionOfficialBattle[] | null>()
  const kook = env.KOOK_BOT_TOKEN ? createKookRestClient({ token: env.KOOK_BOT_TOKEN }) : null

  console.log(JSON.stringify({
    msg: 'regear_apply_binder_job_loaded',
    scanned: applies.length,
    kookEnabled: Boolean(kook),
  }))

  let updated = 0
  let bound = 0
  let bindFailed = 0

  for (const apply of applies) {
    console.log(JSON.stringify({
      msg: 'regear_apply_binder_apply_start',
      applyId: apply.id,
      msgId: apply.msgId,
      status: apply.status,
      victimName: apply.victimName ?? undefined,
      victimGuild: apply.victimGuild ?? undefined,
    }))

    const result = await tryBindOneApply({
      apply,
      client,
      db,
      windowMs,
      battleFetchLimit,
      eventFetchLimit,
      guildNameToIdCache,
      guildIdToBattlesCache,
    })

    if (result.type === 'missing_fields') {
      const now = new Date().toISOString()
      await db.update(regearApplies)
        .set({ status: ApplyStatus.BIND_FAILED, lastStatusTime: now })
        .where(eq(regearApplies.id, apply.id))
        .execute()
      console.log(JSON.stringify({ msg: 'regear_apply_binder_apply_failed_missing_fields', applyId: apply.id }))
      updated += 1
      bindFailed += 1
      continue
    }

    if (result.type === 'bound') {
      const now = new Date().toISOString()
      await db.update(regearApplies)
        .set({
          eventId: result.eventId,
          battleId: result.battleId,
          status: ApplyStatus.PENDING_AUDIT,
          lastStatusTime: now,
        })
        .where(eq(regearApplies.id, apply.id))
        .execute()
      if (apply.msgId && kook) {
        try {
          await addKookMessageReaction({ client: kook, msgId: apply.msgId, emoji: '🔗' })
          console.log(JSON.stringify({ msg: 'regear_apply_binder_kook_reaction_ok', applyId: apply.id, msgId: apply.msgId, emoji: '🔗' }))
        } catch (e) {
          const err = e as any
          console.error(JSON.stringify({
            msg: 'regear_apply_binder_kook_reaction_failed',
            applyId: apply.id,
            msgId: apply.msgId,
            emoji: '🔗',
            error: { name: err?.name, message: err?.message ?? String(e) },
          }))
        }
      }
      console.log(JSON.stringify({
        msg: 'regear_apply_binder_apply_bound',
        applyId: apply.id,
        eventId: result.eventId,
        battleId: result.battleId,
      }))
      updated += 1
      bound += 1
      continue
    }

    console.log(JSON.stringify({ msg: 'regear_apply_binder_apply_noop', applyId: apply.id, result: result.type }))
  }

  const summary = { scanned: applies.length, updated, bound, bindFailed }
  console.log(JSON.stringify({ msg: 'regear_apply_binder_job_done', ...summary, durationMs: Date.now() - jobStartedAt }))
  return summary
}

async function tryBindOneApply(params: {
  apply: RegearApplyRow
  client: AlbionApiClient
  db: ReturnType<typeof drizzle>
  windowMs: number
  battleFetchLimit: number
  eventFetchLimit: number
  guildNameToIdCache: Map<string, string | null>
  guildIdToBattlesCache: Map<string, AlbionOfficialBattle[] | null>
}): Promise<BindResult> {
  const { apply, client, db, windowMs, battleFetchLimit, eventFetchLimit } = params

  if (apply.eventId) return { type: 'skipped' }

  const detail = safeJsonParse<Record<string, unknown>>(apply.applyDetail)
  const timestampRaw = stringOrUndefined(detail?.timestamp) ?? undefined
  const victimNameRaw = (apply.victimName ?? undefined) ?? stringOrUndefined(detail?.victimName)
  const guildNameRaw = (apply.victimGuild ?? undefined) ?? stringOrUndefined(detail?.victimGuild)

  const victimName = victimNameRaw?.trim()
  const guildName = guildNameRaw?.trim()
  const applyTime = timestampRaw ? parseUtcTimestamp(timestampRaw) : null

  if (!victimName || !guildName || !applyTime) {
    console.log(JSON.stringify({
      msg: 'regear_apply_binder_apply_missing_fields',
      applyId: apply.id,
      hasVictimName: Boolean(victimName),
      hasVictimGuild: Boolean(guildName),
      hasTimestamp: Boolean(applyTime),
    }))
    return { type: 'missing_fields' }
  }

  const guildId = await getGuildIdFromName(db, guildName, params.guildNameToIdCache)
  if (!guildId) {
    console.log(JSON.stringify({ msg: 'regear_apply_binder_guild_not_found', applyId: apply.id, victimGuild: guildName }))
    return { type: 'no_match' }
  }

  const battles = await getGuildBattles(client, guildId, battleFetchLimit, params.guildIdToBattlesCache)
  if (!battles || battles.length === 0) {
    console.log(JSON.stringify({ msg: 'regear_apply_binder_no_battles', applyId: apply.id, guildId }))
    return { type: 'no_match' }
  }

  const applyTimeMs = applyTime.getTime()
  const candidateBattles = battles.filter((b) => {
    const startMs = Date.parse(b.startTime)
    const endMs = Date.parse(b.endTime)
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false
    return applyTimeMs >= startMs - windowMs && applyTimeMs <= endMs + windowMs
  })

  const battlesToScan = candidateBattles.length > 0 ? candidateBattles : battles.slice(0, 10)
  console.log(JSON.stringify({
    msg: 'regear_apply_binder_battle_candidates',
    applyId: apply.id,
    guildId,
    totalBattles: battles.length,
    candidateBattles: candidateBattles.length,
    battlesToScan: battlesToScan.length,
  }))

  const battleIds = battlesToScan.map((b) => String(b.id))
  const settled = await mapAllSettledBatched(battleIds, 5, (battleId) =>
    client.getBattleEvents(battleId, 0, eventFetchLimit)
  )

  let best: { eventId: string; battleId: string; diffMs: number } | null = null

  for (let i = 0; i < settled.length; i += 1) {
    const res = settled[i]
    if (res.status !== 'fulfilled') {
      const battleId = battleIds[i]
      const reason = (res as PromiseRejectedResult)?.reason
      const err = reason as any
      console.error(JSON.stringify({
        msg: 'regear_apply_binder_battle_events_failed',
        applyId: apply.id,
        battleId,
        error: { name: err?.name, message: err?.message ?? String(reason) },
      }))
      continue
    }
    const candidate = pickBestMatchFromEvents(res.value, victimName, applyTimeMs)
    if (!candidate) continue
    if (!best || candidate.diffMs < best.diffMs) {
      best = candidate
    }
  }

  if (!best) {
    console.log(JSON.stringify({ msg: 'regear_apply_binder_no_event_match', applyId: apply.id, victimName, guildId }))
    return { type: 'no_match' }
  }
  return { type: 'bound', eventId: best.eventId, battleId: best.battleId }
}

async function getGuildIdFromName(db: ReturnType<typeof drizzle>, guildName: string, cache: Map<string, string | null>) {
  const key = guildName.trim().toLowerCase()
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const result = await resolveAlbionGuildIdByName(db, guildName).catch(() => null)
  cache.set(key, result)
  return result
}

async function getGuildBattles(
  client: AlbionApiClient,
  guildId: string,
  battleFetchLimit: number,
  cache: Map<string, AlbionOfficialBattle[] | null>
) {
  const cached = cache.get(guildId)
  if (cached !== undefined) return cached

  try {
    const battles = await client.getGuildBattles(guildId, 0, battleFetchLimit)
    cache.set(guildId, battles)
    return battles
  } catch {
    cache.set(guildId, null)
    return null
  }
}

async function mapAllSettledBatched<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const settled = await Promise.allSettled(batch.map(worker))
    results.push(...settled)
  }
  return results
}

export function parseUtcTimestamp(value: string): Date | null {
  const raw = value.trim()
  if (!raw) return null
  const iso = Date.parse(raw)
  if (!Number.isNaN(iso)) return new Date(iso)

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? '0')))
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function pickBestMatchFromEvents(
  events: readonly AlbionOfficialEvent[],
  victimName: string,
  applyTimeMs: number
): { eventId: string; battleId: string; diffMs: number } | null {
  const applyMinute = Math.floor(applyTimeMs / 60000)
  let best: { eventId: string; battleId: string; diffMs: number } | null = null
  for (const event of events) {
    const eventVictim = event?.Victim?.Name?.trim()
    if (eventVictim !== victimName) continue
    const eventMs = Date.parse(event.TimeStamp)
    if (Number.isNaN(eventMs)) continue
    const eventMinute = Math.floor(eventMs / 60000)
    if (eventMinute !== applyMinute) continue
    const diffMs = Math.abs(eventMs - applyTimeMs)
    const eventId = String(event.EventId)
    const battleId = String(event.BattleId)
    if (!eventId || !battleId) continue
    if (!best || diffMs < best.diffMs) {
      best = { eventId, battleId, diffMs }
    }
  }
  return best
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function stringOrUndefined(v: unknown) {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
