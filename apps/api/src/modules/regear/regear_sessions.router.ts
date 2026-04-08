import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { CreateRegearSessionSchema, UpdateSessionBattlesSchema } from '@albionbox/shared'
import { regearSessions } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import {
  createRegearSession, updateSessionBattles, completeSession,
  getSessionDetail, getSessionSummary,
} from './regear.service'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.post('/:guildId/regear_sessions',
  guildPermMiddleware(['regear:manage']),
  zValidator('json', CreateRegearSessionSchema),
  async (c) => {
    const guildId = c.req.param('guildId')
    const { battleIds } = c.req.valid('json')
    const user = c.get('user' as never) as { id: string }
    const result = await createRegearSession(c.env.DB, guildId, user.id, battleIds)
    return c.json(result, 201)
  }
)

router.get('/:guildId/regear_sessions',
  guildPermMiddleware(['regear:manage', 'regear:approve'], 'ANY'),
  async (c) => {
    const guildId = c.req.param('guildId')
    const db = drizzle(c.env.DB)
    const sessions = await db.select().from(regearSessions).where(eq(regearSessions.guildId, guildId)).all()
    return c.json(sessions)
  }
)

router.get('/:guildId/regear_sessions/:id',
  guildPermMiddleware(['regear:manage', 'regear:approve'], 'ANY'),
  async (c) => {
    const { guildId, id } = c.req.param()
    const detail = await getSessionDetail(c.env.DB, id, guildId)
    if (!detail) return c.json({ error: 'Session 不存在' }, 404)
    return c.json(detail)
  }
)

router.put('/:guildId/regear_sessions/:id/battles',
  guildPermMiddleware(['regear:manage']),
  zValidator('json', UpdateSessionBattlesSchema),
  async (c) => {
    const { id: sessionId } = c.req.param()
    const { battleIds } = c.req.valid('json')
    try {
      const result = await updateSessionBattles(c.env.DB, sessionId, battleIds)
      return c.json(result)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 404 | 500)
    }
  }
)

router.post('/:guildId/regear_sessions/:id/complete',
  guildPermMiddleware(['regear:manage']),
  async (c) => {
    const { id: sessionId } = c.req.param()
    try {
      const result = await completeSession(c.env.DB, sessionId)
      return c.json(result)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 404 | 500)
    }
  }
)

router.get('/:guildId/regear_sessions/:id/summary',
  guildPermMiddleware(['regear:manage', 'regear:approve'], 'ANY'),
  async (c) => {
    const { guildId, id } = c.req.param()
    const summary = await getSessionSummary(c.env.DB, id, guildId)
    if (!summary) return c.json({ error: 'Session 不存在' }, 404)
    return c.json(summary)
  }
)

export { router as regearSessionsRouter }
