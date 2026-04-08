import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { BattleRecordPageSchema } from '@albionbox/shared'
import { battleRecords } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { HttpBattleDataSource } from './data_source'
import { syncBattleRecords, getBattleDetail } from './battle_records.service'

const router = new Hono<{ Bindings: Env }>()
const dataSource = new HttpBattleDataSource()

router.use('*', authMiddleware)

router.get('/:id/battle_records', guildPermMiddleware(['battle:view']), zValidator('query', BattleRecordPageSchema), async (c) => {
  const guildId = c.req.param('id')
  const { page, limit } = c.req.valid('query')
  const db = drizzle(c.env.DB)

  const records = await db.select()
    .from(battleRecords)
    .where(eq(battleRecords.guildId, guildId))
    .limit(limit)
    .offset((page - 1) * limit)
    .all()

  return c.json({ page, limit, data: records })
})

router.post('/:id/battle_records/sync', guildPermMiddleware(['battle:view']), async (c) => {
  const guildId = c.req.param('id')
  try {
    const result = await syncBattleRecords(c.env.DB, guildId, dataSource, c.env.BATTLE_DB_URL, c.env.BATTLE_DB_TOKEN)
    return c.json(result)
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    return c.json({ error: err.message ?? '同步失败' }, (err.status ?? 500) as 400 | 404 | 500)
  }
})

router.get('/:id/battle_records/:battleId', guildPermMiddleware(['battle:view']), async (c) => {
  const { id: guildId, battleId } = c.req.param()
  const detail = await getBattleDetail(c.env.DB, guildId, battleId)
  if (!detail) return c.json({ error: '战斗记录不存在' }, 404)
  return c.json(detail)
})

export { router as battleRecordsRouter }
