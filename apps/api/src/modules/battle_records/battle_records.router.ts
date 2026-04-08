import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, count, eq, inArray, sql } from 'drizzle-orm'
import { BattleRecordPageSchema } from '@albionbox/shared'
import { battleRecords, battleDeaths, guilds } from '@albionbox/db'
import { regearSessions, regearSessionBattles, regearRecords } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { HttpBattleDataSource } from './data_source'

const router = new Hono<{ Bindings: Env }>()
const dataSource = new HttpBattleDataSource()

router.use('*', authMiddleware)

router.get('/:id/battle_records', guildPermMiddleware(['battle:view']), zValidator('query', BattleRecordPageSchema), async (c) => {
  const guildId = c.req.param('id')
  const { page, limit } = c.req.valid('query')
  const offset = (page - 1) * limit
  const db = drizzle(c.env.DB)

  const records = await db.select()
    .from(battleRecords)
    .where(eq(battleRecords.guildId, guildId))
    .limit(limit)
    .offset(offset)
    .all()

  return c.json({ page, limit, data: records })
})

router.post('/:id/battle_records/sync', guildPermMiddleware(['battle:view']), async (c) => {
  const guildId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const guild = await db.select().from(guilds).where(eq(guilds.id, guildId)).get()
  if (!guild) return c.json({ error: '工会不存在' }, 404)
  if (!guild.albionGuildId) return c.json({ error: '工会尚未通过审核，无 Albion Guild ID' }, 400)

  const battles = await dataSource.fetchGuildBattles(
    guild.albionGuildId,
    c.env.BATTLE_DB_URL,
    c.env.BATTLE_DB_TOKEN,
  )

  let synced = 0
  for (const battle of battles) {
    const existing = await db.select({ id: battleRecords.id })
      .from(battleRecords)
      .where(and(eq(battleRecords.guildId, guildId), eq(battleRecords.externalId, battle.id)))
      .get()

    const guildPlayerIds = battle.players
      .filter(p => p.guildId === guild.albionGuildId)
      .map(p => p.id)

    let recordId: string
    if (existing) {
      recordId = existing.id
      await db.update(battleRecords)
        .set({ battleAt: battle.startTime, participants: JSON.stringify(guildPlayerIds) })
        .where(eq(battleRecords.id, recordId))
        .execute()
    } else {
      recordId = crypto.randomUUID()
      await db.insert(battleRecords).values({
        id: recordId,
        guildId,
        externalId: battle.id,
        battleAt: battle.startTime,
        participants: JSON.stringify(guildPlayerIds),
        createdAt: new Date().toISOString(),
      }).execute()
    }

    const guildDeaths = battle.events.filter(e => e.Victim.GuildId === guild.albionGuildId)
    for (const event of guildDeaths) {
      const deathExists = await db.select({ id: battleDeaths.id })
        .from(battleDeaths)
        .where(and(
          eq(battleDeaths.battleRecordId, recordId),
          eq(battleDeaths.albionPlayerId, event.Victim.Id),
          eq(battleDeaths.killedAt, event.TimeStamp),
        ))
        .get()

      if (!deathExists) {
        await db.insert(battleDeaths).values({
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

  return c.json({ synced })
})

router.get('/:id/battle_records/:battleId', guildPermMiddleware(['battle:view']), async (c) => {
  const { id: guildId, battleId } = c.req.param()
  const db = drizzle(c.env.DB)

  const [record, deaths] = await Promise.all([
    db.select().from(battleRecords)
      .where(and(eq(battleRecords.id, battleId), eq(battleRecords.guildId, guildId)))
      .get(),
    db.select().from(battleDeaths).where(eq(battleDeaths.battleRecordId, battleId)).all(),
  ])

  if (!record) return c.json({ error: '战斗记录不存在' }, 404)

  const sessionBattle = await db.select({ sessionId: regearSessionBattles.sessionId })
    .from(regearSessionBattles)
    .where(eq(regearSessionBattles.battleRecordId, battleId))
    .get()

  let regearInfo: Record<string, unknown> | null = null
  if (sessionBattle) {
    const [session, [progress]] = await Promise.all([
      db.select().from(regearSessions).where(eq(regearSessions.id, sessionBattle.sessionId)).get(),
      db.select({
        total: count(),
        approved: sql<number>`sum(case when ${regearRecords.status} = 'approved' then 1 else 0 end)`,
        done: sql<number>`sum(case when ${regearRecords.status} = 'done' then 1 else 0 end)`,
      }).from(regearRecords).where(eq(regearRecords.sessionId, sessionBattle.sessionId)),
    ])

    regearInfo = {
      sessionId: sessionBattle.sessionId,
      status: session?.status ?? null,
      progress: {
        total: progress.total,
        approved: progress.approved,
        done: progress.done,
      },
    }
  }

  return c.json({ ...record, battleDeaths: deaths, regearSession: regearInfo })
})

export { router as battleRecordsRouter }
