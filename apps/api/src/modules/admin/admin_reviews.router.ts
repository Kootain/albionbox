import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { ApproveGuildSchema, RejectGuildSchema, ApproveBindingSchema, RejectBindingSchema } from '@albionbox/shared'
import { guilds, gameAccounts } from '@albionbox/db'
import { authMiddleware } from '../users'
import { platformPermMiddleware } from '../permissions'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)
router.use('*', platformPermMiddleware('platform:admin'))

router.get('/guild_reviews', async (c) => {
  const db = drizzle(c.env.DB)
  const result = await db.select().from(guilds).where(eq(guilds.status, 'pending')).all()
  return c.json(result)
})

router.post('/guild_reviews/:id/approve', zValidator('json', ApproveGuildSchema), async (c) => {
  const guildId = c.req.param('id')
  const { albionGuildId } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const guild = await db.select().from(guilds).where(eq(guilds.id, guildId)).get()
  if (!guild) return c.json({ error: '工会不存在' }, 404)
  if (guild.status !== 'pending') return c.json({ error: '工会不在待审核状态' }, 400)

  await db.update(guilds)
    .set({ status: 'active', albionGuildId })
    .where(eq(guilds.id, guildId))
    .execute()

  return c.json({ message: '工会审核通过' })
})

router.post('/guild_reviews/:id/reject', zValidator('json', RejectGuildSchema), async (c) => {
  const guildId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const guild = await db.select().from(guilds).where(eq(guilds.id, guildId)).get()
  if (!guild) return c.json({ error: '工会不存在' }, 404)
  if (guild.status !== 'pending') return c.json({ error: '工会不在待审核状态' }, 400)

  await db.update(guilds).set({ status: 'rejected' }).where(eq(guilds.id, guildId)).execute()
  return c.json({ message: '工会已拒绝' })
})

router.get('/binding_reviews', async (c) => {
  const db = drizzle(c.env.DB)
  const result = await db.select().from(gameAccounts).where(eq(gameAccounts.status, 'pending')).all()
  return c.json(result)
})

router.post('/binding_reviews/:id/approve', zValidator('json', ApproveBindingSchema), async (c) => {
  const accountId = c.req.param('id')
  const { albionPlayerId } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const [account, duplicate] = await Promise.all([
    db.select().from(gameAccounts).where(eq(gameAccounts.id, accountId)).get(),
    db.select().from(gameAccounts)
      .where(and(eq(gameAccounts.albionPlayerId, albionPlayerId), eq(gameAccounts.status, 'active')))
      .get(),
  ])

  if (!account) return c.json({ error: '游戏账号不存在' }, 404)
  if (account.status !== 'pending') return c.json({ error: '账号不在待审核状态' }, 400)
  if (duplicate) return c.json({ error: '该 Albion Player ID 已被其他账号占用' }, 409)

  await db.update(gameAccounts)
    .set({ status: 'active', albionPlayerId })
    .where(eq(gameAccounts.id, accountId))
    .execute()

  return c.json({ message: '绑定审核通过' })
})

router.post('/binding_reviews/:id/reject', zValidator('json', RejectBindingSchema), async (c) => {
  const accountId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const account = await db.select().from(gameAccounts).where(eq(gameAccounts.id, accountId)).get()
  if (!account) return c.json({ error: '游戏账号不存在' }, 404)
  if (account.status !== 'pending') return c.json({ error: '账号不在待审核状态' }, 400)

  await db.update(gameAccounts).set({ status: 'rejected' }).where(eq(gameAccounts.id, accountId)).execute()
  return c.json({ message: '绑定已拒绝' })
})

export { router as adminReviewsRouter }
