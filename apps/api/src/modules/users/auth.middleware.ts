import type { MiddlewareHandler } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '@albionbox/db'

export interface SessionPayload {
  userId: string
  sessionsVersion: number
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  const raw = await c.env.KV.get(token)
  if (!raw) return c.json({ error: 'Unauthorized' }, 401)

  const session: SessionPayload = JSON.parse(raw)

  const db = drizzle(c.env.DB)
  const user = await db.select().from(users).where(eq(users.id, session.userId)).get()
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  if (user.sessionsVersion !== session.sessionsVersion) {
    return c.json({ error: 'Session expired, please login again' }, 401)
  }

  c.set('user' as never, {
    id: user.id,
    email: user.email,
    sessionsVersion: user.sessionsVersion,
    activeGameAccountId: user.activeGameAccountId,
  })
  c.set('token' as never, token)

  await next()
}
