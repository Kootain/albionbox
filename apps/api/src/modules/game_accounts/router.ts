import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, count, eq, gt } from 'drizzle-orm'
import { CancelBindRequestSchema, CreateBindRequestSchema } from '@albionbox/shared'
import { gameAccounts, bindingTokens, guildMembers, users } from '@albionbox/db'
import { authMiddleware } from '../users'
import { ManualVerifier } from './binding_verifier'
import type { AppContext } from '../../context'

const MAX_GAME_ACCOUNTS = 10
const verifier = new ManualVerifier()
const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()


const createBindRequestHandler = factory.createHandlers(zValidator('json', CreateBindRequestSchema), async (c) => {
      const user = c.get('user')
      const { username, server } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const [[{ value: bindedCount }], bindings, exists] = await Promise.all([
        db.select({ value: count() }).from(gameAccounts).where(and(eq(gameAccounts.userId, user.id), eq(gameAccounts.status, 'verified'))).all(),

        db.select().from(bindingTokens).where(and(eq(bindingTokens.userId, user.id), eq(bindingTokens.status, 'pending'))).all(),

        db.select().from(bindingTokens).where(and(eq(bindingTokens.username, username), eq(bindingTokens.server, server), eq(bindingTokens.status, 'pending'), gt(bindingTokens.expiresAt, new Date().toISOString()))).all()
      ])

      if (exists.length > 0) {
        return c.json({ error: '此账号正在绑定中' }, 400)
      }

      for (const binding of bindings) {
        if (binding.username === username && binding.server === server) {
          return c.json({ error: '已发起绑定' }, 400)
        }
      }

      if (bindedCount + bindings.length >= MAX_GAME_ACCOUNTS) {
        return c.json({ error: `每个用户最多绑定 ${MAX_GAME_ACCOUNTS} 个游戏账号` }, 400)
      }


      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(bindingTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        username,
        server,
        token,
        expiresAt,
      }).execute()

      // 尝试自动验证（第一阶段 ManualVerifier 始终返回 false，保留 pending 等待管理员人工审核）
      const autoVerified = await verifier.verify(token, username)
      if (autoVerified) {
        console.error('自动验证成功, TODO!')
      }

      return c.json({ bindingToken: token }, 201)
    });

const listGameAccountsHandler = factory.createHandlers(async (c) => {
      const user = c.get('user')
      const db = drizzle(c.env.DB)

    const [accounts, pendingRequests] = await Promise.all([
      db.select().from(gameAccounts).where(eq(gameAccounts.userId, user.id)).all(),
      db.select().from(bindingTokens).where(
        and(eq(bindingTokens.userId, user.id), eq(bindingTokens.status, 'pending'))
      ).all(),
    ])

  return c.json({ accounts, pendingRequests })
})

const cancelBindRequestHandler = factory.createHandlers(zValidator('param', CancelBindRequestSchema), async (c) => {
      const user = c.get('user')
      const id = c.req.param('id')
      if (!id) return c.json({ error: '绑定请求不存在' }, 404)

      const db = drizzle(c.env.DB)

      const binding = await db
        .select()
        .from(bindingTokens)
        .where(eq(bindingTokens.id, id))
        .get()

      if (!binding) return c.json({ error: '绑定请求不存在' }, 404)

      await db.update(bindingTokens).set({ status: 'cancelled' }).where(eq(bindingTokens.id, binding.id)).execute()

      return c.json({ message: '绑定请求已取消' })
    });


const deleteGameAccountHandler = factory.createHandlers(async (c) => {
      const user = c.get('user')
      const { id: accountId } = c.req.param() as Record<string, string>
      const db = drizzle(c.env.DB)

      const account = await db
        .select()
        .from(gameAccounts)
        .where(and(eq(gameAccounts.id, accountId), eq(gameAccounts.userId, user.id)))
        .get()

      if (!account) return c.json({ error: '游戏账号不存在' }, 404)

      const ops: Promise<unknown>[] = [
        db.update(gameAccounts).set({ status: 'idle', userId: null }).where(eq(gameAccounts.id, accountId)).execute(),
      ]

      if (user.activeGameAccountId === accountId) {
        ops.push(
          db.update(users).set({ activeGameAccountId: null }).where(eq(users.id, user.id)).execute()
        )
      }

      await Promise.all(ops)

      return c.json({ message: '游戏账号已解绑' })
    });


const routes = router
      .use('*', authMiddleware)
      .post('/bind_requests', ...createBindRequestHandler)
      .delete('/bind_requests/:id', ...cancelBindRequestHandler)
      .get('/', ...listGameAccountsHandler)
      .delete('/:id', ...deleteGameAccountHandler);

export { routes as gameAccountsRouter }
