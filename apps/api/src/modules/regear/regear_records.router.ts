import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { RejectRegearRecordSchema } from '@albionbox/shared'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { transitionRecord, submitRecord } from './regear.service'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.post('/:guildId/regear_records/:id/submit', async (c) => {
  const { id: recordId } = c.req.param()
  const user = c.get('user' as never) as { id: string; activeGameAccountId: string | null }
  try {
    await submitRecord(c.env.DB, recordId, user.activeGameAccountId)
    return c.json({ message: '已提交' })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 403 | 404 | 500)
  }
})

router.post('/:guildId/regear_records/:id/approve',
  guildPermMiddleware(['regear:approve']),
  async (c) => {
    const { id: recordId } = c.req.param()
    const user = c.get('user' as never) as { id: string }
    try {
      await transitionRecord(c.env.DB, recordId, 'pending', 'approved', user.id, false, null)
      return c.json({ message: '已批准' })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 404 | 500)
    }
  }
)

router.post('/:guildId/regear_records/:id/reject',
  guildPermMiddleware(['regear:approve']),
  zValidator('json', RejectRegearRecordSchema),
  async (c) => {
    const { id: recordId } = c.req.param()
    const { note } = c.req.valid('json')
    const user = c.get('user' as never) as { id: string }
    try {
      await transitionRecord(c.env.DB, recordId, 'pending', 'rejected', user.id, false, note)
      return c.json({ message: '已拒绝' })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 404 | 500)
    }
  }
)

router.post('/:guildId/regear_records/:id/complete',
  guildPermMiddleware(['regear:manage']),
  async (c) => {
    const { id: recordId } = c.req.param()
    const user = c.get('user' as never) as { id: string }
    try {
      await transitionRecord(c.env.DB, recordId, 'approved', 'done', user.id, false, null)
      return c.json({ message: '已完成' })
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      return c.json({ error: err.message ?? '操作失败' }, (err.status ?? 500) as 400 | 404 | 500)
    }
  }
)

export { router as regearRecordsRouter }
