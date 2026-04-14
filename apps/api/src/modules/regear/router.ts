import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { 
  CreateRegearTicketSchema, 
  UpdateRegearTicketSchema, 
  UpdateRegearStatusSchema 
} from '@albionbox/shared'
import { 
  regearTickets, 
  regearTicketBattles,
  regears, 
  regearLogs 
} from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const createTicketHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  zValidator('json', CreateRegearTicketSchema),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const { battleIds, eventIds, players, server, config } = c.req.valid('json')
    const db = drizzle(c.env.DB)

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

    const battlesToInsert = battleIds.map((battleId: string) => ({
      id: crypto.randomUUID(),
      ticketId,
      guildId,
      battleId,
      createdAt: now,
    }))

    if (battlesToInsert.length > 0) {
      await db.insert(regearTicketBattles).values(battlesToInsert).execute()
    }

    const regearsToInsert = eventIds.map((eventId: string) => ({
      id: crypto.randomUUID(),
      ticketId,
      eventId,
      status: 'pending_review' as const,
      server,
      playerName: players?.[eventId] ?? '',
      createdAt: now,
      updatedAt: now,
    }))

    if (regearsToInsert.length > 0) {
      // 每20个一批批量插入
      const batchSize = 10
      for (let i = 0; i < regearsToInsert.length; i += batchSize) {
        const batch = regearsToInsert.slice(i, i + batchSize)
        await db.insert(regears).values(batch).execute()
      }
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

const updateStatusHandler = factory.createHandlers(
  guildPermMiddleware(['guild:regear']),
  zValidator('json', UpdateRegearStatusSchema),
  async (c) => {
    const user = c.get('user')
    const regearId = c.req.param('regearId') as string
    const { status, comment } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regears).where(and(eq(regears.id, regearId), isNull(regears.deletedAt))).get()
    if (!record) return c.json({ error: '补装记录不存在' }, 404)

    const validTransitions: Record<string, string[]> = {
      'pending_review': ['pending_regear', 'rejected', 'excluded'],
      'pending_regear': ['completed', 'rejected', 'pending_review'],
      'rejected': ['pending_review'],
      'excluded': ['pending_review'],
      'completed': ['pending_regear'],
    }

    if (!validTransitions[record.status]?.includes(status)) {
      return c.json({ error: `无法将状态从 ${record.status} 流转到 ${status}` }, 400)
    }

    const now = new Date().toISOString()

    await db.update(regears)
      .set({ status, comment, updatedAt: now })
      .where(eq(regears.id, regearId))
      .execute()

    await db.insert(regearLogs).values({
      id: crypto.randomUUID(),
      regearId,
      action: `${record.status}->${status}`,
      operatorId: user.id,
      comment: comment ?? '',
      createdAt: now,
    }).execute()

    return c.json({ message: '状态更新成功' })
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

    await db.update(regearTickets)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(regearTickets.id, ticketId))
      .execute()

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
  .put('/:guildId/regear/records/:regearId/status', ...updateStatusHandler)
  .delete('/:guildId/regear/records/:regearId', ...deleteRecordHandler)

export { routes as regearRouter }