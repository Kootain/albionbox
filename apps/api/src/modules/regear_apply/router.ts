import { Hono, type MiddlewareHandler } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { drizzle } from 'drizzle-orm/d1'
import { and, count, desc, eq, like, inArray, isNull } from 'drizzle-orm'
import {
  CreateRegearApplySchema,
  UpdateApplyStatusSchema,
  BindRegearApplySchema,
  UpdateApplyDetailSchema,
  ApplyStatus,
  ListRegearAppliesQuerySchema,
  ListRegearApplySupplementCandidatesQuerySchema
} from '@albionbox/shared'
import { regearApplies, regears } from '@albionbox/db'
import { authMiddleware } from '../users'
import { internalAuthMiddleware } from '../internal'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const authOrInternalMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === c.env.INTERNAL_API_TOKEN) {
    return internalAuthMiddleware(c, next)
  }
  return authMiddleware(c, next)
}

const createApplyHandler = factory.createHandlers(
  zValidator('json', CreateRegearApplySchema),
  async (c) => {
    const data = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const applyMetaStr = data.applyMeta ? JSON.stringify(data.applyMeta) : null
    const applyDetailStr = data.applyDetail ? JSON.stringify(data.applyDetail) : null

    await db.insert(regearApplies).values({
      id,
      msgId: data.msgId,
      msgUsername: data.msgUsername,
      msgUserid: data.msgUserid,
      msgGuild: data.msgGuild,
      msgChannel: data.msgChannel,
      createTime: now,
      lastStatusTime: now,
      status: ApplyStatus.BINDING,
      victimName: data.victimName,
      victimGuild: data.victimGuild,
      applyMeta: applyMetaStr,
      applyDetail: applyDetailStr
    }).execute()

    return c.json({ id, message: '申请创建成功' }, 201)
  }
)

const listAppliesHandler = factory.createHandlers(
  zValidator('query', ListRegearAppliesQuerySchema),
  async (c) => {
    const { msgGuild, status, msgChannel, msgUserid, victimName, limit, offset } = c.req.valid('query')
    const db = drizzle(c.env.DB)

    const conditions = [isNull(regearApplies.deletedAt)]
    if (msgGuild) conditions.push(eq(regearApplies.msgGuild, msgGuild))
    if (status) conditions.push(eq(regearApplies.status, status))
    if (msgChannel) conditions.push(eq(regearApplies.msgChannel, msgChannel))
    if (msgUserid) conditions.push(eq(regearApplies.msgUserid, msgUserid))
    if (victimName) conditions.push(like(regearApplies.victimName, `%${victimName}%`))

    const where = and(...conditions)

    const itemsQuery = db.select().from(regearApplies).where(where)

    const totalQuery = db.select({ value: count() }).from(regearApplies).where(where)

    const [itemsRaw, totalRows] = await Promise.all([
      itemsQuery.orderBy(desc(regearApplies.createTime)).limit(limit).offset(offset).all(),
      totalQuery.all(),
    ])

    const total = totalRows?.[0]?.value ?? 0

    const items = itemsRaw.map((r) => ({
      ...r,
      msgUsername: r.msgUsername ?? undefined,
      msgUserid: r.msgUserid ?? undefined,
      msgGuild: r.msgGuild ?? undefined,
      msgChannel: r.msgChannel ?? undefined,
      regearId: r.regearId ?? undefined,
      eventId: r.eventId ?? undefined,
      battleId: r.battleId ?? undefined,
      applyMeta: r.applyMeta ?? undefined,
      victimName: r.victimName ?? undefined,
      victimGuild: r.victimGuild ?? undefined,
      applyDetail: r.applyDetail ?? undefined,
    }))

    return c.json({ items, total, limit, offset })
  }
)

const listAppliesByBattlesHandler = factory.createHandlers(
  authOrInternalMiddleware,
  zValidator('json', z.object({
    battleIds: z.array(z.string()).min(1)
  })),
  async (c) => {
    const { battleIds } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const items = await db.select()
      .from(regearApplies)
      .where(and(
        inArray(regearApplies.battleId, battleIds),
        isNull(regearApplies.regearId),
        isNull(regearApplies.deletedAt)
      ))
      .all()

    return c.json(items)
  }
)

const listSupplementCandidatesHandler = factory.createHandlers(
  zValidator('query', ListRegearApplySupplementCandidatesQuerySchema),
  async (c) => {
    const { msgGuild, startTime } = c.req.valid('query')
    const db = drizzle(c.env.DB)

    const itemsRaw = await db.select().from(regearApplies)
      .where(and(eq(regearApplies.msgGuild, msgGuild), eq(regearApplies.status, ApplyStatus.PENDING_AUDIT), isNull(regearApplies.deletedAt)))
      .orderBy(desc(regearApplies.createTime))
      .all()

    let filtered = itemsRaw
    if (startTime) {
      filtered = itemsRaw.filter((r) => {
        if (!r.applyDetail) return false
        let parsed: unknown = null
        try {
          parsed = JSON.parse(r.applyDetail)
        } catch {
          return false
        }

        const timestamp = (parsed as { timestamp?: unknown } | null)?.timestamp
        return typeof timestamp === 'string' && timestamp > startTime
      })
    }

    const items = filtered.map((r) => ({
      ...r,
      msgUsername: r.msgUsername ?? undefined,
      msgUserid: r.msgUserid ?? undefined,
      msgGuild: r.msgGuild ?? undefined,
      msgChannel: r.msgChannel ?? undefined,
      regearId: r.regearId ?? undefined,
      regearTicketId: r.regearTicketId ?? undefined,
      eventId: r.eventId ?? undefined,
      battleId: r.battleId ?? undefined,
      applyMeta: r.applyMeta ?? undefined,
      victimName: r.victimName ?? undefined,
      victimGuild: r.victimGuild ?? undefined,
      applyDetail: r.applyDetail ?? undefined,
    }))

    return c.json(items)
  }
)

const deleteApplyHandler = factory.createHandlers(
  async (c) => {
    const id = c.req.param('id') as string
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regearApplies).where(and(eq(regearApplies.id, id), isNull(regearApplies.deletedAt))).get()
    if (!record) return c.json({ error: '记录不存在' }, 404)

    await db.delete(regearApplies).where(eq(regearApplies.id, id)).execute()
    return c.json({ message: '删除成功' })
  }
)

const updateStatusHandler = factory.createHandlers(
  zValidator('json', UpdateApplyStatusSchema),
  async (c) => {
    const id = c.req.param('id') as string
    const { status } = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()

    const record = await db.select().from(regearApplies).where(and(eq(regearApplies.id, id), isNull(regearApplies.deletedAt))).get()
    if (!record) return c.json({ error: '记录不存在' }, 404)

    await db.update(regearApplies)
      .set({ status, lastStatusTime: now })
      .where(eq(regearApplies.id, id))
      .execute()

    return c.json({ message: '状态更新成功' })
  }
)

const bindRegearHandler = factory.createHandlers(
  zValidator('json', BindRegearApplySchema),
  async (c) => {
    const id = c.req.param('id') as string
    const { regearId } = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()

    const record = await db.select().from(regearApplies).where(and(eq(regearApplies.id, id), isNull(regearApplies.deletedAt))).get()
    if (!record) return c.json({ error: '记录不存在' }, 404)

    await db.update(regearApplies)
      .set({ regearId, lastStatusTime: now, status: ApplyStatus.PENDING_AUDIT })
      .where(eq(regearApplies.id, id))
      .execute()

    return c.json({ message: '绑定成功' })
  }
)

const updateDetailHandler = factory.createHandlers(
  zValidator('json', UpdateApplyDetailSchema),
  async (c) => {
    const id = c.req.param('id') as string
    const { applyDetail } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const record = await db.select().from(regearApplies).where(and(eq(regearApplies.id, id), isNull(regearApplies.deletedAt))).get()
    if (!record) return c.json({ error: '记录不存在' }, 404)

    await db.update(regearApplies)
      .set({ applyDetail: JSON.stringify(applyDetail) })
      .where(eq(regearApplies.id, id))
      .execute()

    return c.json({ message: '详情更新成功' })
  }
)

const deleteApplyByMsgHandler = factory.createHandlers(
  async (c) => {
    const msgId = c.req.param('msgId') as string
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()

    const record = await db.select().from(regearApplies).where(and(eq(regearApplies.msgId, msgId), isNull(regearApplies.deletedAt))).get()
    if (!record) return c.json({ error: '记录不存在' }, 404)

    await db.update(regearApplies)
      .set({ deletedAt: now })
      .where(eq(regearApplies.msgId, msgId))
      .execute()

    return c.json({ message: '删除成功' })
  }
)

const reactionByMsgHandler = factory.createHandlers(
  zValidator('json', z.object({
    action: z.enum(['add', 'remove'])
  })),
  async (c) => {
    const msgId = c.req.param('msgId') as string
    const { action } = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()

    const apply = await db.select().from(regearApplies).where(and(eq(regearApplies.msgId, msgId), isNull(regearApplies.deletedAt))).get()
    if (!apply) return c.json({ error: '记录不存在' }, 404)

    if (action === 'add') {
      await db.update(regearApplies)
        .set({ status: ApplyStatus.DONE, lastStatusTime: now })
        .where(eq(regearApplies.msgId, msgId))
        .execute()

      if (apply.regearId) {
        await db.update(regears)
          .set({ status: 'completed', updatedAt: now })
          .where(eq(regears.id, apply.regearId))
          .execute()
      }
    } else if (action === 'remove') {
      if (apply.regearId) {
        await db.update(regearApplies)
          .set({ status: ApplyStatus.PENDING_REGEAR, lastStatusTime: now })
          .where(eq(regearApplies.msgId, msgId))
          .execute()

        await db.update(regears)
          .set({ status: 'pending_regear', updatedAt: now })
          .where(eq(regears.id, apply.regearId))
          .execute()
      } else {
        await db.update(regearApplies)
          .set({ status: ApplyStatus.BINDING, lastStatusTime: now })
          .where(eq(regearApplies.msgId, msgId))
          .execute()
      }
    }

    return c.json({ message: '操作成功' })
  }
)

const routes = router
  .post('/', authOrInternalMiddleware, ...createApplyHandler)
  .delete('/by-msg/:msgId', internalAuthMiddleware, ...deleteApplyByMsgHandler)
  .post('/by-msg/:msgId/reaction', internalAuthMiddleware, ...reactionByMsgHandler)
  .use('*', authMiddleware)
  .post('/by-battles', ...listAppliesByBattlesHandler)
  .get('/supplement-candidates', ...listSupplementCandidatesHandler)
  .get('/', ...listAppliesHandler)
  .delete('/:id', ...deleteApplyHandler)
  .put('/:id/status', ...updateStatusHandler)
  .put('/:id/bind', ...bindRegearHandler)
  .put('/:id/detail', ...updateDetailHandler)

export { routes as regearApplyRouter }
