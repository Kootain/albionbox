import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { count, eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { CreateGuildSchema, BattleType, decodeBattleTypes, encodeBattleTypes } from '@albionbox/shared'
import { guilds, guildMembers, battles } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { createGuildWithAdmin } from './guilds.service'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()
const createGuildHandler = factory.createHandlers(zValidator('json', CreateGuildSchema), async (c) => {
      const user = c.get('user')
      if (!user.activeGameAccountId) return c.json({ error: '请先设置激活游戏角色后再注册工会' }, 403)
      
      const { id, name, server } = c.req.valid('json')
      const { guildId, bindingToken } = await createGuildWithAdmin(c.env.DB, {
        id,
        name,
        server,
        ownerId: user.id,
        activeGameAccountId: user.activeGameAccountId,
      })

      return c.json({ guildId, bindingToken }, 201)
    });
const listGuildsHandler = factory.createHandlers(async (c) => {
      const user = c.get('user')
      if (!user.activeGameAccountId) return c.json([])

      const db = drizzle(c.env.DB)
      const result = await db
        .select({ guild: guilds })
        .from(guildMembers)
        .innerJoin(guilds, eq(guildMembers.guildId, guilds.id))
        .where(eq(guildMembers.gameAccountId, user.activeGameAccountId))
        .all()

      return c.json(result.map(r => r.guild))
    });
const getGuildHandler = factory.createHandlers(guildPermMiddleware(['guild:view']), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const db = drizzle(c.env.DB)

      const [guild, [{ value: memberCount }]] = await Promise.all([
        db.select().from(guilds).where(eq(guilds.id, guildId)).get(),
        db.select({ value: count() }).from(guildMembers).where(eq(guildMembers.guildId, guildId)),
      ])

      if (!guild) return c.json({ error: '工会不存在' }, 404)

      return c.json({ ...guild, memberCount })
    });


const upsertBattleHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']), // Note: you might want a stricter permission for updating
  zValidator('param', z.object({
    id: z.string().min(1),
    battleId: z.coerce.number().int().positive()
  })),
  zValidator('json', z.object({
    server: z.enum(['asia', 'eu', 'us']),
    types: z.array(z.nativeEnum(BattleType)).optional()
  })),
  async (c) => {
    const guildId = c.req.param('id') as string
    const { battleId } = c.req.valid('param')
    const { server, types } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const now = new Date().toISOString()
    const typesMask = types !== undefined ? encodeBattleTypes(types) : undefined

    const existingRecord = await db.select()
      .from(battles)
      .where(and(
        eq(battles.guildId, guildId),
        eq(battles.server, server),
        eq(battles.id, battleId)
      ))
      .get()

    if (existingRecord) {
      const updateData: Partial<typeof battles.$inferInsert> = {
        updatedAt: now
      }
      
      if (typesMask !== undefined) {
        updateData.types = typesMask
      }

      await db.update(battles)
        .set(updateData)
        .where(and(
          eq(battles.guildId, guildId),
          eq(battles.server, server),
          eq(battles.id, battleId)
        ))
        .execute()
    } else {
      await db.insert(battles).values({
        id: battleId,
        guildId,
        server,
        types: typesMask ?? 0,
        createdAt: now,
        updatedAt: now,
      }).execute()
    }

    return c.json({ message: existingRecord ? '更新成功' : '创建成功' })
  }
)


const batchSearchBattlesHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  zValidator('json', z.object({
    server: z.enum(['asia', 'eu', 'us']),
    ids: z.array(z.coerce.number().int().positive()).min(1),
  })),
  async (c) => {
    const guildId = c.req.param('id') as string
    const { server, ids } = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const records = await db.select()
      .from(battles)
      .where(and(
        eq(battles.guildId, guildId),
        eq(battles.server, server),
        inArray(battles.id, ids)
      ))
      .all()

    const result = records.map(record => ({
      ...record,
      types: decodeBattleTypes(record.types)
    }))

    return c.json(result)
  }
)


const routes = router
      .use('*', authMiddleware)
      .post('/', ...createGuildHandler)
      .get('/', ...listGuildsHandler)
      .get('/:id', ...getGuildHandler)
      .put('/:id/battles/:battleId', ...upsertBattleHandler)
      .post('/:id/battles', ...batchSearchBattlesHandler)


export { routes as guildsRouter }
