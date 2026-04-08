import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, count, eq } from 'drizzle-orm'
import { CreateBindRequestSchema } from '@albionbox/shared'
import { gameAccounts, bindingTokens, guildMembers, users } from '@albionbox/db'
import { authMiddleware } from '../users'

const MAX_GAME_ACCOUNTS = 10

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.post('/bind_requests', zValidator('json', CreateBindRequestSchema), async (c) => {
  const user = c.get('user' as never) as { id: string }
  const { gameId, server } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const [{ value: accountCount }] = await db
    .select({ value: count() })
    .from(gameAccounts)
    .where(and(eq(gameAccounts.userId, user.id), eq(gameAccounts.status, 'pending')))

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(gameAccounts)
    .where(and(eq(gameAccounts.userId, user.id), eq(gameAccounts.status, 'active')))

  if (accountCount + activeCount >= MAX_GAME_ACCOUNTS) {
    return c.json({ error: `每个用户最多绑定 ${MAX_GAME_ACCOUNTS} 个游戏账号` }, 400)
  }

  const now = new Date().toISOString()
  const accountId = crypto.randomUUID()

  await db.insert(gameAccounts).values({
    id: accountId,
    userId: user.id,
    gameId,
    server,
    status: 'pending',
    createdAt: now,
  }).execute()

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await db.insert(bindingTokens).values({
    id: crypto.randomUUID(),
    gameAccountId: accountId,
    token,
    expiresAt,
  }).execute()

  return c.json({ gameAccountId: accountId, bindingToken: token }, 201)
})

router.get('/', async (c) => {
  const user = c.get('user' as never) as { id: string }
  const db = drizzle(c.env.DB)

  const accounts = await db
    .select()
    .from(gameAccounts)
    .where(eq(gameAccounts.userId, user.id))
    .all()

  return c.json(accounts)
})

router.delete('/:id', async (c) => {
  const user = c.get('user' as never) as { id: string; activeGameAccountId: string | null }
  const accountId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const account = await db
    .select()
    .from(gameAccounts)
    .where(and(eq(gameAccounts.id, accountId), eq(gameAccounts.userId, user.id)))
    .get()

  if (!account) return c.json({ error: '游戏账号不存在' }, 404)

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(guildMembers)
    .where(eq(guildMembers.gameAccountId, accountId))

  if (memberCount > 0) {
    return c.json({ error: '该账号仍在工会中，请先从工会移除后再解绑' }, 409)
  }

  const ops: Promise<unknown>[] = [
    db.delete(gameAccounts).where(eq(gameAccounts.id, accountId)).execute(),
  ]

  if (user.activeGameAccountId === accountId) {
    ops.push(
      db.update(users).set({ activeGameAccountId: null }).where(eq(users.id, user.id)).execute()
    )
  }

  await Promise.all(ops)

  return c.json({ message: '游戏账号已解绑' })
})

export { router as gameAccountsRouter }
