import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { promise, z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { and, ne, eq, inArray, isNull } from 'drizzle-orm'
import {
  CreateRegearTicketSchema,
  UpdateRegearTicketSchema,
  UpdateRegearStatusSchema,
  num2emoji,
  ApplyMeta,
  safeJsonParse
} from '@albionbox/shared'
import {
  regearTickets,
  regearTicketBattles,
  regears,
  regearLogs,
  Regear,
  regearApplies,
  RegearApply
} from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'
import { KookClient, RestClient } from '@kookapp/js-sdk'
import { ko } from 'zod/locales'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const createTicketHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  zValidator('json', CreateRegearTicketSchema),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const { battleEvents, players, server, config, needApply } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const eventToBattleId = new Map<string, string | null>()
    const normalizedBattleIds = new Set<string>()
    const normalizedEventEntries: Array<{ eventId: string; battleId: string | null }> = []

    for (const [rawBattleId, rawEventIds] of Object.entries(battleEvents)) {
      const battleId = rawBattleId.trim()
      if (!battleId) return c.json({ error: 'battleEvents 中存在空 battleId' }, 400)

      normalizedBattleIds.add(battleId)

      const uniqueEventIds = Array.from(new Set(rawEventIds.map((id) => id.trim()).filter(Boolean)))
      if (uniqueEventIds.length === 0) {
        return c.json({ error: `battleEvents[${battleId}] 不能为空` }, 400)
      }

      for (const eventId of uniqueEventIds) {
        const existingBattleId = eventToBattleId.get(eventId)
        if (existingBattleId !== undefined && existingBattleId !== battleId) {
          return c.json({ error: `eventId(${eventId}) 同时归属多个 battleId：${existingBattleId}, ${battleId}` }, 400)
        }
        eventToBattleId.set(eventId, battleId)
      }
    }

    for (const [eventId, battleId] of eventToBattleId.entries()) {
      normalizedEventEntries.push({ eventId, battleId })
    }

    if (players) {
      const unknownEventIds = Object.keys(players).filter((eventId) => !eventToBattleId.has(eventId))
      if (unknownEventIds.length > 0) {
        return c.json({ error: 'players 映射包含未知 eventId', unknownEventIds }, 400)
      }
    }

    const allEventIds = Array.from(eventToBattleId.keys())
    const CHUNK_SIZE = 50
    const existing: { eventId: string; ticketId: string }[] = []
    const applies: RegearApply[] = []
    const events2Apply: Record<string, RegearApply> = {}

    for (let i = 0; i < allEventIds.length; i += CHUNK_SIZE) {
      const chunk = allEventIds.slice(i, i + CHUNK_SIZE)

      const chunkResults = await db.select({
        eventId: regears.eventId,
        ticketId: regearTickets.id,
      })
        .from(regears)
        .innerJoin(regearTickets, eq(regearTickets.id, regears.ticketId))
        .where(and(
          ne(regears.status, 'excluded'),
          inArray(regears.eventId, chunk),
          isNull(regears.deletedAt),
          isNull(regearTickets.deletedAt),
        )).all()

      const applyResults = await db.select().from(regearApplies)
        .where(and(
          inArray(regearApplies.eventId, chunk),
          isNull(regearApplies.regearId)
        ))
        .all()

      existing.push(...chunkResults)
      applies.push(...applyResults)
      applyResults.forEach((apply) => {
        events2Apply[apply.eventId || ''] = apply
      })

      // if (existing.length > 0) {
      //   return c.json({ error: '部分补装已在其他工单中处理中', conflicts: existing }, 409)
      // }
    }

    const ticketId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(regearTickets).values({
      id: ticketId,
      guildId,
      config: JSON.stringify(config),
      server,
      createdAt: now,
      updatedAt: now,
    }).execute()

    const battlesToInsert = Array.from(normalizedBattleIds).map((battleId: string) => ({
      id: crypto.randomUUID(),
      ticketId,
      guildId,
      battleId,
      createdAt: now,
    }))

    if (battlesToInsert.length > 0) {
      await db.insert(regearTicketBattles).values(battlesToInsert).execute()
    }
    const regearsToInsert: Array<Regear> = []

    normalizedEventEntries.forEach(({ eventId, battleId }) => {
      if (existing.some((e) => e.eventId === eventId)) {
        return
      }

      const r: Regear = {
        id: crypto.randomUUID(),
        ticketId,
        eventId,
        battleId,
        status: 'pending_review',
        server,
        playerName: players?.[eventId] ?? '',
        createdAt: now,
        updatedAt: now,
        comment: null,
        regearedSlots: null,
        deletedAt: null,
      }
      if (needApply) {
        if (!events2Apply[eventId]) {
          r.status = 'excluded'
        }
      }

      regearsToInsert.push(r)
    })

    if (regearsToInsert.length > 0) {
      const batchSize = 5
      for (let i = 0; i < regearsToInsert.length; i += batchSize) {
        const batch = regearsToInsert.slice(i, i + batchSize)
        await db.insert(regears).values(batch).execute()
      }

      if (applies) {
        for (const r of regearsToInsert) {
          const applyId = events2Apply[r.eventId]?.id
          if (applyId) {
            await db.update(regearApplies)
              .set({
                regearId: r.id,
                regearTicketId: ticketId,
                status: 'pending_regear',
                lastStatusTime: now,
              })
              .where(eq(regearApplies.id, applyId))
              .execute()
          }
        }
      }
    } else {
      return c.json({ error: '所有补装已在其他工单中处理' }, 400)
    }
    return c.json({ ticketId }, 201)
  }
)

const updateTicketHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  zValidator('json', UpdateRegearTicketSchema),
  async (c) => {
    const ticketId = c.req.param('ticketId') as string
    const { config, battleIds, eventIds } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regearTickets).where(and(eq(regearTickets.id, ticketId), isNull(regearTickets.deletedAt))).get()
    if (!record) return c.json({ error: 'Ticket 不存在' }, 404)

    const updateData: Partial<typeof regearTickets.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    }

    if (config !== undefined) updateData.config = JSON.stringify(config)

    const now = new Date().toISOString()

    // Since SQLite doesn't support transactions via D1 SDK perfectly yet or we can just run sequentially
    if (Object.keys(updateData).length > 1) {
      await db.update(regearTickets)
        .set(updateData)
        .where(eq(regearTickets.id, ticketId))
        .execute()
    }

    if (battleIds !== undefined) {
      await db.delete(regearTicketBattles).where(eq(regearTicketBattles.ticketId, ticketId)).execute()
      const battlesToInsert = battleIds.map((battleId: string) => ({
        id: crypto.randomUUID(),
        ticketId,
        guildId: record.guildId,
        battleId,
        createdAt: now,
      }))
      if (battlesToInsert.length > 0) {
        await db.insert(regearTicketBattles).values(battlesToInsert).execute()
      }
    }

    return c.json({ message: '更新成功' })
  }
)

const listTicketsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const db = drizzle(c.env.DB)

    const tickets = await db.select().from(regearTickets)
      .where(and(eq(regearTickets.guildId, guildId), isNull(regearTickets.deletedAt)))
      .all()

    const ticketIds = tickets.map(t => t.id)

    let battles: typeof regearTicketBattles.$inferSelect[] = []
    let events: typeof regears.$inferSelect[] = []

    if (ticketIds.length > 0) {
      battles = await db.select().from(regearTicketBattles).where(inArray(regearTicketBattles.ticketId, ticketIds)).all()
      events = await db.select().from(regears).where(and(inArray(regears.ticketId, ticketIds), isNull(regears.deletedAt))).all()
    }

    return c.json(tickets.map(t => {
      const ticketEvents = events.filter(e => e.ticketId === t.id)
      const pendingReview = ticketEvents.filter(e => e.status === 'pending_review').length
      const pendingRegear = ticketEvents.filter(e => e.status === 'pending_regear').length
      const completedRegear = ticketEvents.filter(e => e.status === 'completed').length

      return {
        ...t,
        battleIds: battles.filter(b => b.ticketId === t.id).map(b => b.battleId),
        eventIds: ticketEvents.map(e => e.eventId),
        config: JSON.parse(t.config),
        stats: {
          totalDeaths: ticketEvents.length,
          reviewedDeaths: ticketEvents.length - pendingReview,
          pendingReview,
          pendingRegear,
          completedRegear
        }
      }
    }))
  }
)

const getTicketHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const ticketId = c.req.param('ticketId') as string
    const db = drizzle(c.env.DB)

    const ticket = await db.select().from(regearTickets)
      .where(and(eq(regearTickets.id, ticketId), isNull(regearTickets.deletedAt)))
      .get()

    if (!ticket) return c.json({ error: 'Ticket 不存在' }, 404)

    const records = await db.select().from(regears)
      .where(and(eq(regears.ticketId, ticketId), isNull(regears.deletedAt)))
      .all()

    const battles = await db.select().from(regearTicketBattles).where(eq(regearTicketBattles.ticketId, ticketId)).all()

    return c.json({
      ...ticket,
      battleIds: battles.map(b => b.battleId),
      eventIds: records.map(e => e.eventId),
      config: JSON.parse(ticket.config),
      regears: records,
    })
  }
)

const listRecordsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const playerName = c.req.query('playerName')
    const server = c.req.query('server')
    const status = c.req.query('status')

    const db = drizzle(c.env.DB)

    const conditions = []
    if (playerName) conditions.push(eq(regears.playerName, playerName))
    if (server) conditions.push(eq(regears.server, server as 'asia' | 'eu' | 'us'))
    if (status) conditions.push(eq(regears.status, status as any))

    // Join with tickets to ensure we only get records for this guild and the ticket is not deleted
    const query = db.select({
      regear: regears,
    })
      .from(regears)
      .innerJoin(regearTickets, eq(regearTickets.id, regears.ticketId))
      .where(and(
        eq(regearTickets.guildId, guildId),
        isNull(regearTickets.deletedAt),
        isNull(regears.deletedAt),
        ...conditions
      ))

    const records = await query.all()
    return c.json(records.map(r => r.regear))
  }
)

const listRecordsByBattlesHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  zValidator('json', z.object({
    battleIds: z.array(z.string()).min(1)
  })),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const { battleIds } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const records = await db.select({
      regear: regears,
    })
      .from(regears)
      .innerJoin(regearTickets, eq(regearTickets.id, regears.ticketId))
      .innerJoin(regearTicketBattles, eq(regearTicketBattles.ticketId, regearTickets.id))
      .where(and(
        eq(regearTickets.guildId, guildId),
        isNull(regearTickets.deletedAt),
        isNull(regears.deletedAt),
        inArray(regearTicketBattles.battleId, battleIds)
      ))
      .all()

    // Deduplicate by regear.id in case multiple battleIds point to same ticket
    const uniqueRecords = new Map<string, typeof records[0]['regear']>()
    for (const row of records) {
      uniqueRecords.set(row.regear.id, row.regear)
    }

    return c.json(Array.from(uniqueRecords.values()))
  }
)

const updateStatusHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  zValidator('json', UpdateRegearStatusSchema),
  async (c) => {
    const user = c.get('user')
    const regearId = c.req.param('regearId') as string
    const { status, regearedSlots, comment } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const [record, apply] = await Promise.all([
      await db.select().from(regears).where(and(eq(regears.id, regearId), isNull(regears.deletedAt))).get(),
      await db.select().from(regearApplies).where(eq(regearApplies.regearId, regearId)).get(),
    ])
    if (!record) return c.json({ error: '补装记录不存在' }, 404)

    const validTransitions: Record<string, string[]> = {
      'pending_review': ['pending_regear', 'rejected', 'excluded'],
      'pending_regear': ['completed', 'rejected', 'pending_review'],
      'rejected': ['pending_review'],
      'excluded': ['pending_review'],
      'completed': ['pending_regear'],
    }

    const isStatusUpdating = status !== undefined && status !== record.status

    if (isStatusUpdating) {
      if (!validTransitions[record.status]?.includes(status)) {
        return c.json({ error: `无法将状态从 ${record.status} 流转到 ${status}` }, 400)
      }
    }

    const now = new Date().toISOString()
    const updateData: Partial<typeof regears.$inferInsert> = { updatedAt: now }
    if (status !== undefined) updateData.status = status
    if (comment !== undefined) updateData.comment = comment
    if (regearedSlots !== undefined) updateData.regearedSlots = JSON.stringify(regearedSlots)

    await db.update(regears)
      .set(updateData)
      .where(eq(regears.id, regearId))
      .execute()
    const kook = new RestClient({ token: c.env.KOOK_BOT_TOKEN })

    if (apply) {
      const applyMeta = safeJsonParse<ApplyMeta>(apply.applyMeta)
      if (isStatusUpdating && status === 'completed') {
        if ((await db.update(regearApplies).set({ status: 'done' }).where(eq(regearApplies.id, apply.id)).execute()).success) {
          const t = [
            kook.addReaction({ msg_id: apply?.msgId ?? '', emoji: '✅' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '⏩' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '🔄' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '❌' }),
          ]
          if (applyMeta?.idx) {
            t.push(kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: num2emoji(applyMeta.idx + 1) }))
          }
          c.executionCtx.waitUntil(Promise.all(t))
          if (comment) {
            kook.createMessage({
              type: 9,
              target_id: apply.msgChannel ?? '',
              content: `(met)${apply.msgUserid}(met) ${comment ?? ''}`,
              quote: apply?.msgId ?? '',
              reply_msg_id: apply?.msgId ?? '',
            })
          }
        }
      }

      if (isStatusUpdating && status === 'rejected') {
        if ((await db.update(regearApplies).set({ status: 'reject' }).where(eq(regearApplies.id, apply.id)).execute()).success) {
          const t = [
            kook.addReaction({ msg_id: apply?.msgId ?? '', emoji: '❌' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '⏩' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '🔄' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '✅' }),
          ]
          c.executionCtx.waitUntil(Promise.all(t))
        }
      }
      if (isStatusUpdating && status === 'pending_regear') {
        if ((await db.update(regearApplies).set({ status: 'pending_regear' }).where(eq(regearApplies.id, apply.id)).execute()).success) {
          const t = [
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '❌' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '✅' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '⏩' }),
            kook.addReaction({ msg_id: apply?.msgId ?? '', emoji: '🔄' }),
          ]
          c.executionCtx.waitUntil(Promise.all(t))
        }
      }
      if (isStatusUpdating && status === 'pending_review') {
        if ((await db.update(regearApplies).set({ status: 'pending_audit' }).where(eq(regearApplies.id, apply.id)).execute()).success) {

          const t = [
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '❌' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '✅' }),
            kook.deleteReaction({ msg_id: apply?.msgId ?? '', emoji: '🔄' }),
            kook.addReaction({ msg_id: apply?.msgId ?? '', emoji: '⏩' }),
          ]
          c.executionCtx.waitUntil(Promise.all(t))
        }
      }
    }

    if (isStatusUpdating || comment || regearedSlots) {
      const actionParts = []
      if (isStatusUpdating) actionParts.push(`${record.status}->${status}`)
      if (regearedSlots !== undefined) actionParts.push('updated_slots')

      await db.insert(regearLogs).values({
        id: crypto.randomUUID(),
        regearId,
        action: actionParts.length > 0 ? actionParts.join(', ') : 'update',
        operatorId: user.id,
        comment: comment ?? '',
        createdAt: now,
      }).execute()
    }

    return c.json({ message: '更新成功' })
  }
)

const deleteTicketHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  async (c) => {
    const ticketId = c.req.param('ticketId') as string
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regearTickets)
      .where(and(eq(regearTickets.id, ticketId), isNull(regearTickets.deletedAt)))
      .get()

    if (!record) return c.json({ error: 'Ticket 不存在' }, 404)

    const now = new Date().toDateString()
    await Promise.all(
      [
        db.update(regearApplies).set({status: 'pending_audit', regearId: null, regearTicketId: null}).where(eq(regearApplies.regearTicketId, ticketId)).execute(),
        db.update(regears).set({deletedAt:now }).where(eq(regears.ticketId, ticketId)).execute(),
        db.update(regearTickets).set({ deletedAt: now }).where(eq(regearTickets.id, ticketId)).execute()
      ]
    )
    return c.json({ message: '删除成功' })
  }
)

const deleteRecordHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  async (c) => {
    const user = c.get('user')
    const regearId = c.req.param('regearId') as string
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regears)
      .where(and(eq(regears.id, regearId), isNull(regears.deletedAt)))
      .get()

    if (!record) return c.json({ error: '补装记录不存在' }, 404)

    const now = new Date().toISOString()

    await db.update(regears)
      .set({ deletedAt: now })
      .where(eq(regears.id, regearId))
      .execute()

    await db.insert(regearLogs).values({
      id: crypto.randomUUID(),
      regearId,
      action: `deleted`,
      operatorId: user.id,
      comment: '软删除记录',
      createdAt: now,
    }).execute()

    return c.json({ message: '删除成功' })
  }
)

const checkBattlesTicketsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  zValidator('json', z.object({
    battleIds: z.array(z.string()).min(1)
  })),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const { battleIds } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const records = await db.select({
      battleId: regearTicketBattles.battleId,
      ticketId: regearTickets.id,
    })
      .from(regearTicketBattles)
      .innerJoin(regearTickets, eq(regearTickets.id, regearTicketBattles.ticketId))
      .where(and(
        eq(regearTicketBattles.guildId, guildId),
        inArray(regearTicketBattles.battleId, battleIds),
        isNull(regearTickets.deletedAt)
      ))
      .all()

    const mapping = records.reduce((acc, curr) => {
      acc[curr.battleId] = curr.ticketId
      return acc
    }, {} as Record<string, string>)

    return c.json(mapping)
  }
)

const routes = router
  .use('*', authMiddleware)
  .post('/:guildId/regear/tickets', ...createTicketHandler)
  .get('/:guildId/regear/tickets', ...listTicketsHandler)
  .post('/:guildId/regear/battles/check-tickets', ...checkBattlesTicketsHandler)
  .get('/:guildId/regear/tickets/:ticketId', ...getTicketHandler)
  .put('/:guildId/regear/tickets/:ticketId', ...updateTicketHandler)
  .delete('/:guildId/regear/tickets/:ticketId', ...deleteTicketHandler)
  .get('/:guildId/regear/records', ...listRecordsHandler)
  .post('/:guildId/regear/records/by-battles', ...listRecordsByBattlesHandler)
  .put('/:guildId/regear/records/:regearId/status', ...updateStatusHandler)
  .delete('/:guildId/regear/records/:regearId', ...deleteRecordHandler)

export { routes as regearRouter }
