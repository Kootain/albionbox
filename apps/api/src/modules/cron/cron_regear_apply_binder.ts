import { drizzle } from 'drizzle-orm/d1'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { ApplyStatus, AlbionServer, safeJsonParse, ApplyMeta} from '@albionbox/shared'
import { regearApplies } from '@albionbox/db'
import { AlbionApiClient } from '../../lib/albion-sdk'
import { createKookRestClient } from '../../lib/kook-sdk'
import { resolveAlbionGuildIdByName } from '../guilds/guilds.service'
import { applyDetail, getBattlesBeforeTime, selectBattlesByTime, getBattlesEvents, match, parseUtcTimestamp } from './reger_apply_match'
import {num2emoji} from '@albionbox/shared'

type RegearApplyRow = typeof regearApplies.$inferSelect

interface Apply extends RegearApplyRow {
  detail: applyDetail
  meta: ApplyMeta
}

export async function runRegearApplyAutoBinder(
  env: Env, omitFailed: boolean = false
) {
  const db = drizzle(env.DB)
  const limit = 300

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
    console.log(JSON.stringify({ msg: 'regear_apply_binder_job_no_work' }))
    return { scanned: 0, updated: 0, bound: 0, bindFailed: 0 }
  }

  const client = new AlbionApiClient(AlbionServer.ASIA)
  const kook = env.KOOK_BOT_TOKEN ? createKookRestClient({ token: env.KOOK_BOT_TOKEN }) : null

  let updated = 0
  let bound = 0
  let bindFailed = 0

  const applyDetails: Apply[] = []
  for (const apply of applies) {
    const applyDetail = safeJsonParse<applyDetail>(apply.applyDetail)
    const applyMeta = safeJsonParse<ApplyMeta>(apply.applyMeta)
    if (applyMeta == null || applyDetail == null || applyDetail.victimName == '' || applyDetail.killerName == '' || applyDetail.timestamp == '') {
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

    applyDetails.push({ ...apply, detail: applyDetail, meta: applyMeta })
  }

  const guildGroups = groupAppliesByGuild(applyDetails)

  const events = (await Promise.all(guildGroups.map(async (group) => {
    const guildId = await resolveAlbionGuildIdByName(db, group.guildName)
    if (guildId == null) {
      return []
    }
    const battles = await getBattlesBeforeTime(client, guildId, group.earliestApplyTimeMs)
    const uniqueBattles = [...new Map(battles.map(i => [i.id, i])).values()];
    console.log(`[regear_apply_binder] get ${battles.length} battles, ${uniqueBattles.length} unique battles, before ${group.earliestApplyTimeMs} last ${battles[battles.length-1].id} at ${battles[battles.length-1].startTime} - ${battles[battles.length-1].endTime}`)
    const selectedBattles = selectBattlesByTime(battles, group.applies.map(apply => parseUtcTimestamp(apply.detail.timestamp)?.getTime() || 0))
    console.log(`[regear_apply_binder] select ${selectedBattles.length} battles: ${JSON.stringify(selectedBattles.map(battle => battle.id))}`)
    return getBattlesEvents(client, selectedBattles)
  }))).flat()

  await Promise.all(applyDetails.map(async (apply) => {
    if (apply == null) return;

    const matched = match(apply.detail, events)
    // 匹配失败
    if (matched == null) {
      const ts = parseUtcTimestamp(apply.detail.timestamp)
      if (ts != null && ts.getTime() > Date.now() + 20 * 60 * 1000) return  // 刚击杀完20min buffer
      else {
        if (!omitFailed) {
          db.update(regearApplies)
            .set({ status: ApplyStatus.BIND_FAILED, lastStatusTime: new Date().toISOString() })
            .where(eq(regearApplies.id, apply.id))
            .execute()
        }
      }
      updated += 1
      bindFailed += 1
      return
    }
    
    // 匹配成功
    const now = new Date().toISOString()
    await db.update(regearApplies).set({
        eventId: matched.EventId.toString(),
        battleId: matched.BattleId.toString(),
        status: ApplyStatus.PENDING_AUDIT,
        lastStatusTime: now,
      }).where(eq(regearApplies.id, apply.id)).execute()
    if (apply.msgId && kook) {
      try {
        await Promise.all([
          kook.deleteReaction({msg_id: apply.msgId, emoji: '▶️' }),
          kook.addReaction({msg_id: apply.msgId, emoji: '⏩' }),
          // kook.deleteReaction({msg_id: apply.msgId, emoji: num2emoji(apply.meta.idx+1)})
        ])
      } catch (e) {
        const err = e as any
        console.error(`[kook] add reaction failed ${err?.message ?? String(e)}`)
      }
      updated += 1
      bound += 1
    }
  }))

  const summary = { scanned: applies.length, updated, bound, bindFailed }

  console.log(JSON.stringify({ msg: 'regear_apply_binder_job_done', ...summary }))
  return summary
}


function groupAppliesByGuild(applies: Apply[]) {
  const map = new Map<string, { guildName: string; applies: Apply[]; earliestApplyTimeMs: number }>()
  for (const a of applies) {
    const key = a.detail.victimGuild.trim().toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.applies.push(a)
      existing.earliestApplyTimeMs = Math.min(existing.earliestApplyTimeMs, parseUtcTimestamp(a.detail.timestamp)?.getTime() ?? Number.POSITIVE_INFINITY)
    } else {
      map.set(key, { guildName: a.detail.victimGuild, applies: [a], earliestApplyTimeMs: parseUtcTimestamp(a.detail.timestamp)?.getTime() ?? Number.POSITIVE_INFINITY })
    }
  }
  return Array.from(map.values())
}

