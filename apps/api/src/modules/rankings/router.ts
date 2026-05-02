import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, gte, desc } from 'drizzle-orm'
import { z } from 'zod'
import { CreateRankingSchema, RankingType } from '@albionbox/shared'
import { guildRankings } from '@albionbox/db'
import type { AppContext } from '../../context'

// TODO: Create proper API token validation. Using simple middleware here
import type { MiddlewareHandler } from 'hono'


const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const createRankingHandler = factory.createHandlers(
  zValidator('json', CreateRankingSchema),
  async (c) => {
    const data = c.req.valid('json')
    const guildId = c.req.param('guildId') as string

    if (data.guildId !== guildId) {
      return c.json({ error: 'Guild ID mismatch' }, 400)
    }

    const db = drizzle(c.env.DB)
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(guildRankings).values({
      id,
      guildId: data.guildId,
      rankingType: data.rankingType,
      collectedAt: data.collectedAt,
      data: JSON.stringify(data.data),
      createdAt: now,
    }).execute()

    return c.json({ id, message: 'Ranking created successfully' }, 201)
  }
)

const getLatestRankingsHandler = factory.createHandlers(
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const db = drizzle(c.env.DB)

    // Using group by type approach to get latest, SQLite does not support standard partition functions well.
    // An alternative is querying each type individually, or sorting by collectedAt descending and taking first occurrence in memory.
    const allRecords = await db.select()
      .from(guildRankings)
      .where(eq(guildRankings.guildId, guildId))
      .orderBy(desc(guildRankings.collectedAt))
      .all()

    const latestByType = new Map<string, typeof allRecords[0]>()

    for (const record of allRecords) {
      if (!latestByType.has(record.rankingType)) {
        latestByType.set(record.rankingType, record)
      }
    }

    const result = Array.from(latestByType.values()).map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }))

    return c.json(result)
  }
)

const getRankingsByTypeHandler = factory.createHandlers(
  zValidator('query', z.object({
    seconds: z.coerce.number().int().positive().optional().default(3600) // Default 1 hour
  })),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const type = c.req.param('type') as string
    const { seconds } = c.req.valid('query')
    const db = drizzle(c.env.DB)

    const thresholdDate = new Date(Date.now() - seconds * 1000).toISOString()

    const records = await db.select()
      .from(guildRankings)
      .where(and(
        eq(guildRankings.guildId, guildId),
        eq(guildRankings.rankingType, type),
        gte(guildRankings.collectedAt, thresholdDate)
      ))
      .orderBy(desc(guildRankings.collectedAt))
      .all()

    const result = records.map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }))

    return c.json(result)
  }
)

const routes = router
  .post('/:guildId/rankings', ...createRankingHandler)
  .get('/:guildId/rankings/latest', ...getLatestRankingsHandler)
  .get('/:guildId/rankings/:type', ...getRankingsByTypeHandler)

export { routes as rankingsRouter }
