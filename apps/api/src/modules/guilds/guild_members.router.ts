import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { AddMemberSchema, AssignMemberRoleSchema, ChestPositionSchema } from '@albionbox/shared'
import { guildMembers, guildMemberRoles, guilds, gameAccounts, roles } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.get('/:id/members', guildPermMiddleware(['guild:view']), async (c) => {
  const guildId = c.req.param('id')
  const db = drizzle(c.env.DB)
  const members = await db.select().from(guildMembers).where(eq(guildMembers.guildId, guildId)).all()
  return c.json(members)
})

router.post('/:id/members', guildPermMiddleware(['guild:manage']), zValidator('json', AddMemberSchema), async (c) => {
  const guildId = c.req.param('id')
  const { userId, gameAccountId } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  if (!userId && !gameAccountId) {
    return c.json({ error: '必须提供 userId 或 gameAccountId' }, 400)
  }

  if (gameAccountId) {
    const [account, guild] = await Promise.all([
      db.select().from(gameAccounts).where(eq(gameAccounts.id, gameAccountId)).get(),
      db.select().from(guilds).where(eq(guilds.id, guildId)).get(),
    ])
    if (!account) return c.json({ error: '游戏账号不存在' }, 404)
    if (!guild) return c.json({ error: '工会不存在' }, 404)
    if (account.server !== guild.server) {
      return c.json({ error: '游戏账号服务器与工会服务器不匹配' }, 400)
    }
  }

  const memberId = crypto.randomUUID()
  await db.insert(guildMembers).values({
    id: memberId,
    guildId,
    userId: userId ?? null,
    gameAccountId: gameAccountId ?? null,
    joinedAt: new Date().toISOString(),
  }).execute()

  return c.json({ id: memberId }, 201)
})

router.delete('/:id/members/:memberId', guildPermMiddleware(['guild:manage']), async (c) => {
  const { id: guildId, memberId } = c.req.param()
  const db = drizzle(c.env.DB)

  const member = await db.select().from(guildMembers)
    .where(and(eq(guildMembers.id, memberId), eq(guildMembers.guildId, guildId)))
    .get()
  if (!member) return c.json({ error: '成员不存在' }, 404)

  await db.delete(guildMembers).where(eq(guildMembers.id, memberId)).execute()
  return c.json({ message: '成员已移除' })
})

router.post('/:id/members/:memberId/roles', guildPermMiddleware(['guild:manage']), zValidator('json', AssignMemberRoleSchema), async (c) => {
  const { id: guildId, memberId } = c.req.param()
  const { roleId } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const [member, role] = await Promise.all([
    db.select().from(guildMembers).where(and(eq(guildMembers.id, memberId), eq(guildMembers.guildId, guildId))).get(),
    db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.guildId, guildId))).get(),
  ])
  if (!member) return c.json({ error: '成员不存在' }, 404)
  if (!role) return c.json({ error: '角色不存在' }, 404)

  const existing = await db.select().from(guildMemberRoles)
    .where(and(eq(guildMemberRoles.guildMemberId, memberId), eq(guildMemberRoles.roleId, roleId)))
    .get()
  if (!existing) {
    await db.insert(guildMemberRoles).values({ guildMemberId: memberId, roleId }).execute()
  }

  return c.json({ message: '角色已分配' })
})

router.delete('/:id/members/:memberId/roles/:roleId', guildPermMiddleware(['guild:manage']), async (c) => {
  const { memberId, roleId } = c.req.param()
  const db = drizzle(c.env.DB)

  await db.delete(guildMemberRoles)
    .where(and(eq(guildMemberRoles.guildMemberId, memberId), eq(guildMemberRoles.roleId, roleId)))
    .execute()

  return c.json({ message: '角色已移除' })
})

router.put('/:id/members/:memberId/chest_position', guildPermMiddleware(['guild:manage']), zValidator('json', ChestPositionSchema), async (c) => {
  const { id: guildId, memberId } = c.req.param()
  const { x, y } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const member = await db.select().from(guildMembers)
    .where(and(eq(guildMembers.id, memberId), eq(guildMembers.guildId, guildId)))
    .get()
  if (!member) return c.json({ error: '成员不存在' }, 404)

  await db.update(guildMembers).set({ chestX: x, chestY: y }).where(eq(guildMembers.id, memberId)).execute()
  return c.json({ message: '箱子坐标已更新' })
})

export { router as guildMembersRouter }
