import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, desc, eq, lte } from 'drizzle-orm'
import {
  CreateSettlementCycleSchema,
  ToggleSettlementPaidSchema,
} from '@albionbox/shared'
import {
  settlementCycles,
  settlementDetails,
  guildSettings,
  guildRankings,
} from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'
import {
  parseRankingSnapshotData,
  generateMightRewardDetails,
  generateMightTopRewardDetails,
  generateResourceRewardDetails,
  type SettlementDetailInsert,
} from './generators'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const createSettlementCycleHandler = factory.createHandlers(
  guildPermMiddleware(['guild:manage']),
  zValidator('json', CreateSettlementCycleSchema),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const input = c.req.valid('json')
    if (input.guildId !== guildId) return c.json({ error: 'Guild ID mismatch' }, 400)

    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()
    const user = c.get('user')

    const settings = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
    const dataCollectionGuildId = settings?.dataCollectionGuildId
    if (!dataCollectionGuildId) return c.json({ error: 'Data collection guild id not bound' }, 400)

    const baselineCutoff = new Date(`${input.startDate}T23:59:59.999+08:00`).toISOString()
    const endOfDay = new Date(`${input.endDate}T23:59:59.999+08:00`).toISOString()

    const enabledRankingTypes = Array.from(new Set([
      ...input.config.mightReward.enabledTypes,
      ...input.config.mightTopReward.enabledTypes,
    ]))

    const missingTypes: string[] = []
    const rankingIdByType: Record<string, string> = {}
    const rankingDataByType = new Map<string, Map<string, number>>()

    for (const type of enabledRankingTypes) {
      const record = await db.select()
        .from(guildRankings)
        .where(and(
          eq(guildRankings.guildId, dataCollectionGuildId),
          eq(guildRankings.rankingType, type),
          lte(guildRankings.collectedAt, endOfDay),
        ))
        .orderBy(desc(guildRankings.collectedAt))
        .get()

      if (!record) {
        missingTypes.push(type)
        continue
      }

      rankingIdByType[type] = record.id
      rankingDataByType.set(type, parseRankingSnapshotData(record.data))
    }

    if (missingTypes.length > 0) {
      const latestAvailableByType: Record<string, { id: string; collectedAt: string } | null> = {}
      for (const type of missingTypes) {
        const latest = await db.select({ id: guildRankings.id, collectedAt: guildRankings.collectedAt })
          .from(guildRankings)
          .where(and(
            eq(guildRankings.guildId, dataCollectionGuildId),
            eq(guildRankings.rankingType, type),
          ))
          .orderBy(desc(guildRankings.collectedAt))
          .get()

        latestAvailableByType[type] = latest ?? null
      }

      return c.json({
        error: 'Missing rankings for selected types',
        missingTypes,
        cutoffCollectedAt: endOfDay,
        dataCollectionGuildId,
        latestAvailableByType,
      }, 400)
    }

    const settlementId = crypto.randomUUID()

    await db.insert(settlementCycles).values({
      id: settlementId,
      guildId,
      startDate: input.startDate,
      endDate: input.endDate,
      rankingIds: JSON.stringify(rankingIdByType),
      config: JSON.stringify(input.config),
      createdAt: now,
      createdByUserId: user?.id,
    }).execute()

    const baselineRankingDataByType = new Map<string, Map<string, number>>()
    for (const type of input.config.mightTopReward.enabledTypes) {
      const record = await db.select()
        .from(guildRankings)
        .where(and(
          eq(guildRankings.guildId, dataCollectionGuildId),
          eq(guildRankings.rankingType, type),
          lte(guildRankings.collectedAt, baselineCutoff),
        ))
        .orderBy(desc(guildRankings.collectedAt))
        .get()

      if (!record) continue
      baselineRankingDataByType.set(type, parseRankingSnapshotData(record.data))
    }

    const detailsToInsert: SettlementDetailInsert[] = []

    detailsToInsert.push(...generateMightRewardDetails({
      guildId,
      settlementId,
      now,
      config: input.config,
      rankingDataByType,
    }))

    detailsToInsert.push(...generateMightTopRewardDetails({
      guildId,
      settlementId,
      now,
      config: input.config,
      rankingDataByType,
      baselineRankingDataByType,
    }))

    detailsToInsert.push(...generateResourceRewardDetails({
      guildId,
      settlementId,
      now,
      config: input.config,
    }))

    if (detailsToInsert.length > 0) {
      const CHUNK_SIZE = 5
      for (let i = 0; i < detailsToInsert.length; i += CHUNK_SIZE) {
        await db.insert(settlementDetails).values(detailsToInsert.slice(i, i + CHUNK_SIZE)).execute()
      }
    }

    return c.json({
      id: settlementId,
      cycle: {
        id: settlementId,
        guildId,
        startDate: input.startDate,
        endDate: input.endDate,
        rankingIds: JSON.stringify(rankingIdByType),
        config: JSON.stringify(input.config),
        createdAt: now,
        createdByUserId: user?.id,
      },
      counts: {
        total: detailsToInsert.length,
        byRewardType: detailsToInsert.reduce((acc, d) => {
          acc[d.rewardType] = (acc[d.rewardType] ?? 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
    }, 201)
  }
)

const listSettlementCyclesHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const db = drizzle(c.env.DB)
    const records = await db.select().from(settlementCycles).where(eq(settlementCycles.guildId, guildId)).orderBy(desc(settlementCycles.createdAt)).all()
    return c.json({ items: records })
  }
)

const getSettlementAggregatedHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const settlementId = c.req.param('settlementId') as string
    const db = drizzle(c.env.DB)

    const cycle = await db.select().from(settlementCycles).where(and(eq(settlementCycles.id, settlementId), eq(settlementCycles.guildId, guildId))).get()
    if (!cycle) return c.json({ error: 'Not found' }, 404)

    const details = await db.select().from(settlementDetails).where(and(eq(settlementDetails.settlementId, settlementId), eq(settlementDetails.guildId, guildId))).all()

    const rewardOrder = new Map<string, number>([
      ['MIGHT_REWARD', 1],
      ['MIGHT_TOP_REWARD', 2],
      ['RESOURCE_REWARD', 3],
    ])

    const columnsSet = new Map<string, { key: string; rewardType: string; subType: string }>()
    for (const d of details) {
      const key = `${d.rewardType}:${d.subType}`
      if (!columnsSet.has(key)) columnsSet.set(key, { key, rewardType: d.rewardType, subType: d.subType })
    }

    const columns = Array.from(columnsSet.values()).sort((a, b) => {
      const ao = rewardOrder.get(a.rewardType) ?? 99
      const bo = rewardOrder.get(b.rewardType) ?? 99
      if (ao !== bo) return ao - bo
      return a.subType.localeCompare(b.subType)
    })

    const rowMap = new Map<string, {
      recipientKey: string
      username?: string
      platformId?: string
      platformType?: string
      values: Record<string, number>
      total: number
      isPaid: boolean
      paidCount: number
      allCount: number
    }>()

    for (const d of details) {
      const key = d.recipientKey
      const colKey = `${d.rewardType}:${d.subType}`
      const row = rowMap.get(key) ?? {
        recipientKey: key,
        username: d.username ?? undefined,
        platformId: d.platformId ?? undefined,
        platformType: d.platformType ?? undefined,
        values: {},
        total: 0,
        isPaid: false,
        paidCount: 0,
        allCount: 0,
      }

      row.values[colKey] = (row.values[colKey] ?? 0) + d.coinAmount
      row.total += d.coinAmount
      row.allCount += 1
      row.paidCount += d.isPaid ? 1 : 0

      if (!row.username && d.username) row.username = d.username
      if (!row.platformId && d.platformId) row.platformId = d.platformId
      if (!row.platformType && d.platformType) row.platformType = d.platformType

      rowMap.set(key, row)
    }

    const rows = Array.from(rowMap.values()).map((r) => ({
      recipientKey: r.recipientKey,
      username: r.username,
      platformId: r.platformId,
      platformType: r.platformType,
      values: r.values,
      total: r.total,
      isPaid: r.allCount > 0 && r.paidCount === r.allCount,
    })).sort((a, b) => b.total - a.total)

    return c.json({ cycle, columns, rows })
  }
)

const getSettlementDetailsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const settlementId = c.req.param('settlementId') as string
    const db = drizzle(c.env.DB)

    const cycle = await db.select().from(settlementCycles).where(and(eq(settlementCycles.id, settlementId), eq(settlementCycles.guildId, guildId))).get()
    if (!cycle) return c.json({ error: 'Not found' }, 404)

    const details = await db.select().from(settlementDetails).where(and(eq(settlementDetails.settlementId, settlementId), eq(settlementDetails.guildId, guildId))).orderBy(desc(settlementDetails.coinAmount)).all()
    return c.json({ cycle, details })
  }
)

const deleteSettlementCycleHandler = factory.createHandlers(
  guildPermMiddleware(['guild:manage']),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const settlementId = c.req.param('settlementId') as string
    const db = drizzle(c.env.DB)

    const cycle = await db.select({ id: settlementCycles.id })
      .from(settlementCycles)
      .where(and(eq(settlementCycles.id, settlementId), eq(settlementCycles.guildId, guildId)))
      .get()

    if (!cycle) return c.json({ error: 'Not found' }, 404)

    await db.delete(settlementDetails)
      .where(and(
        eq(settlementDetails.guildId, guildId),
        eq(settlementDetails.settlementId, settlementId),
      ))
      .execute()

    await db.delete(settlementCycles)
      .where(and(
        eq(settlementCycles.guildId, guildId),
        eq(settlementCycles.id, settlementId),
      ))
      .execute()

    return c.json({ ok: true })
  }
)

const toggleSettlementPaidHandler = factory.createHandlers(
  guildPermMiddleware(['guild:manage']),
  zValidator('json', ToggleSettlementPaidSchema),
  async (c) => {
    const guildId = c.req.param('guildId') as string
    const settlementId = c.req.param('settlementId') as string
    const input = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()
    const user = c.get('user')

    const cycle = await db.select().from(settlementCycles).where(and(eq(settlementCycles.id, settlementId), eq(settlementCycles.guildId, guildId))).get()
    if (!cycle) return c.json({ error: 'Not found' }, 404)

    await db.update(settlementDetails)
      .set(input.isPaid ? {
        isPaid: true,
        paidAt: now,
        paidByUserId: user?.id ?? null,
      } : {
        isPaid: false,
        paidAt: null,
        paidByUserId: null,
      })
      .where(and(
        eq(settlementDetails.guildId, guildId),
        eq(settlementDetails.settlementId, settlementId),
        eq(settlementDetails.recipientKey, input.recipientKey),
      ))
      .execute()

    return c.json({ ok: true })
  }
)

const routes = router
  .use('*', authMiddleware)
  .post('/:guildId/settlements', ...createSettlementCycleHandler)
  .get('/:guildId/settlements', ...listSettlementCyclesHandler)
  .get('/:guildId/settlements/:settlementId/aggregated', ...getSettlementAggregatedHandler)
  .get('/:guildId/settlements/:settlementId/details', ...getSettlementDetailsHandler)
  .put('/:guildId/settlements/:settlementId/paid', ...toggleSettlementPaidHandler)
  .delete('/:guildId/settlements/:settlementId', ...deleteSettlementCycleHandler)

export { routes as settlementsRouter }
