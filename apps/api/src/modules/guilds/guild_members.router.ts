import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { AddMemberSchema, AssignMemberRoleSchema, ChestPositionSchema } from '@albionbox/shared'
import { guildMembers, guildMemberRoles, guilds, gameAccounts, roles } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()
const listMembersHandler = factory.createHandlers(guildPermMiddleware(['guild:view']), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const db = drizzle(c.env.DB)
      const members = await db.select().from(guildMembers).where(eq(guildMembers.guildId, guildId)).all()
      return c.json(members)
    });
const addMemberHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), zValidator('json', AddMemberSchema), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
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
    });
const removeMemberHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), async (c) => {
      const { id: guildId, memberId } = c.req.param() as { [key: string]: string } as Record<string, string>
      const db = drizzle(c.env.DB)

      const member = await db.select().from(guildMembers)
        .where(and(eq(guildMembers.id, memberId), eq(guildMembers.guildId, guildId)))
        .get()
      if (!member) return c.json({ error: '成员不存在' }, 404)

      await db.delete(guildMembers).where(eq(guildMembers.id, memberId)).execute()
      return c.json({ message: '成员已移除' })
    });
const assignMemberRoleHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), zValidator('json', AssignMemberRoleSchema), async (c) => {
      const { id: guildId, memberId } = c.req.param() as { [key: string]: string } as Record<string, string>
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
    });
const removeMemberRoleHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), async (c) => {
      const { memberId, roleId } = c.req.param() as { [key: string]: string } as Record<string, string>
      const db = drizzle(c.env.DB)

      await db.delete(guildMemberRoles)
        .where(and(eq(guildMemberRoles.guildMemberId, memberId), eq(guildMemberRoles.roleId, roleId)))
        .execute()

      return c.json({ message: '角色已移除' })
    });
const updateChestPositionHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), zValidator('json', ChestPositionSchema), async (c) => {
      const { id: guildId, memberId } = c.req.param() as { [key: string]: string } as Record<string, string>
      const { x, y } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const member = await db.select().from(guildMembers)
        .where(and(eq(guildMembers.id, memberId), eq(guildMembers.guildId, guildId)))
        .get()
      if (!member) return c.json({ error: '成员不存在' }, 404)

      await db.update(guildMembers).set({ chestX: x, chestY: y }).where(eq(guildMembers.id, memberId)).execute()
      return c.json({ message: '箱子坐标已更新' })
    });


const routes = router
      .use('*', authMiddleware)
      .get('/:id/members', ...listMembersHandler)
      .post('/:id/members', ...addMemberHandler)
      .delete('/:id/members/:memberId', ...removeMemberHandler)
      .post('/:id/members/:memberId/roles', ...assignMemberRoleHandler)
      .delete('/:id/members/:memberId/roles/:roleId', ...removeMemberRoleHandler)
      .put('/:id/members/:memberId/chest_position', ...updateChestPositionHandler);

export { routes as guildMembersRouter }
