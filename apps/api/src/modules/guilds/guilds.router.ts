import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { count, eq } from 'drizzle-orm'
import { CreateGuildSchema } from '@albionbox/shared'
import { guilds, guildMembers } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { createGuildWithAdmin } from './guilds.service'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.post('/', zValidator('json', CreateGuildSchema), async (c) => {
  const user = c.get('user' as never) as { id: string; activeGameAccountId: string | null }
  if (!user.activeGameAccountId) {
    return c.json({ error: '请先设置激活游戏角色后再注册工会' }, 403)
  }

  const { name, server } = c.req.valid('json')
  const { guildId, bindingToken } = await createGuildWithAdmin(c.env.DB, {
    name,
    server,
    ownerId: user.id,
    activeGameAccountId: user.activeGameAccountId,
  })

  return c.json({ guildId, bindingToken }, 201)
})

router.get('/', async (c) => {
  const user = c.get('user' as never) as { id: string; activeGameAccountId: string | null }
  if (!user.activeGameAccountId) return c.json([])

  const db = drizzle(c.env.DB)
  const result = await db
    .select({ guild: guilds })
    .from(guildMembers)
    .innerJoin(guilds, eq(guildMembers.guildId, guilds.id))
    .where(eq(guildMembers.gameAccountId, user.activeGameAccountId))
    .all()

  return c.json(result.map(r => r.guild))
})

router.get('/:id', guildPermMiddleware(['guild:view']), async (c) => {
  const guildId = c.req.param('id')
  const db = drizzle(c.env.DB)

  const [guild, [{ value: memberCount }]] = await Promise.all([
    db.select().from(guilds).where(eq(guilds.id, guildId)).get(),
    db.select({ value: count() }).from(guildMembers).where(eq(guildMembers.guildId, guildId)),
  ])

  if (!guild) return c.json({ error: '工会不存在' }, 404)

  return c.json({ ...guild, memberCount })
})

export { router as guildsRouter }
