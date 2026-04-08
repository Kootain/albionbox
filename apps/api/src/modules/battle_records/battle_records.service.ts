import { drizzle } from 'drizzle-orm/d1'
import { and, count, eq, sql } from 'drizzle-orm'
import { battleRecords, battleDeaths, guilds } from '@albionbox/db'
import { regearSessions, regearSessionBattles, regearRecords } from '@albionbox/db'
import type { BattleDataSource, AlbionBattle } from './data_source'

export async function syncBattleRecords(
  db: D1Database,
  guildId: string,
  dataSource: BattleDataSource,
  dbUrl: string,
  dbToken: string,
): Promise<{ synced: number }> {
  const d = drizzle(db)
  const guild = await d.select().from(guilds).where(eq(guilds.id, guildId)).get()
  if (!guild) throw Object.assign(new Error('工会不存在'), { status: 404 })
  if (!guild.albionGuildId) throw Object.assign(new Error('工会尚未通过审核，无 Albion Guild ID'), { status: 400 })

  const battles = await dataSource.fetchGuildBattles(guild.albionGuildId, dbUrl, dbToken)
  let synced = 0

  for (const battle of battles) {
    const allPlayerIds = battle.players.map(p => p.id)
    const existing = await d.select({ id: battleRecords.id })
      .from(battleRecords)
      .where(and(eq(battleRecords.guildId, guildId), eq(battleRecords.externalId, battle.id)))
      .get()

    let recordId: string
    if (existing) {
      recordId = existing.id
      await d.update(battleRecords)
        .set({ battleAt: battle.startTime, participants: JSON.stringify(allPlayerIds) })
        .where(eq(battleRecords.id, recordId))
        .execute()
    } else {
      recordId = crypto.randomUUID()
      await d.insert(battleRecords).values({
        id: recordId,
        guildId,
        externalId: battle.id,
        battleAt: battle.startTime,
        participants: JSON.stringify(allPlayerIds),
        createdAt: new Date().toISOString(),
      }).execute()
    }

    const guildDeaths = battle.events.filter(e => e.Victim.GuildID === guild.albionGuildId)
    for (const event of guildDeaths) {
      const deathExists = await d.select({ id: battleDeaths.id })
        .from(battleDeaths)
        .where(and(
          eq(battleDeaths.battleRecordId, recordId),
          eq(battleDeaths.albionPlayerId, event.Victim.Id),
          eq(battleDeaths.killedAt, event.TimeStamp),
        ))
        .get()

      if (!deathExists) {
        await d.insert(battleDeaths).values({
          id: crypto.randomUUID(),
          battleRecordId: recordId,
          albionPlayerId: event.Victim.Id,
          playerName: event.Victim.Name,
          equipment: JSON.stringify(event.Victim.Equipment),
          killedAt: event.TimeStamp,
        }).execute()
      }
    }

    synced++
  }

  return { synced }
}

export async function getBattleDetail(db: D1Database, guildId: string, battleId: string) {
  const d = drizzle(db)

  const [record, deaths] = await Promise.all([
    d.select().from(battleRecords)
      .where(and(eq(battleRecords.id, battleId), eq(battleRecords.guildId, guildId)))
      .get(),
    d.select().from(battleDeaths).where(eq(battleDeaths.battleRecordId, battleId)).all(),
  ])

  if (!record) return null

  const sessionBattle = await d.select({ sessionId: regearSessionBattles.sessionId })
    .from(regearSessionBattles)
    .where(eq(regearSessionBattles.battleRecordId, battleId))
    .get()

  let regearInfo: Record<string, unknown> | null = null
  if (sessionBattle) {
    const [session, [progress]] = await Promise.all([
      d.select().from(regearSessions).where(eq(regearSessions.id, sessionBattle.sessionId)).get(),
      d.select({
        total: count(),
        approved: sql<number>`sum(case when ${regearRecords.status} = 'approved' then 1 else 0 end)`,
        done: sql<number>`sum(case when ${regearRecords.status} = 'done' then 1 else 0 end)`,
      }).from(regearRecords).where(eq(regearRecords.sessionId, sessionBattle.sessionId)),
    ])

    regearInfo = {
      sessionId: sessionBattle.sessionId,
      status: session?.status ?? null,
      progress: { total: progress.total, approved: progress.approved, done: progress.done },
    }
  }

  return { ...record, battleDeaths: deaths, regearSession: regearInfo }
}
