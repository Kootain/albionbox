import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { CreateRoleSchema, AssignRolePermissionSchema } from '@albionbox/shared'
import { roles, rolePermissions, permissions } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()
const listRolesHandler = factory.createHandlers(guildPermMiddleware(['guild:view']), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const db = drizzle(c.env.DB)
      const result = await db.select().from(roles)
        .where(and(eq(roles.scope, 'guild'), eq(roles.guildId, guildId)))
        .all()
      return c.json(result)
    });
const createRoleHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), zValidator('json', CreateRoleSchema), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const { name } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const roleId = crypto.randomUUID()
      await db.insert(roles).values({
        id: roleId,
        scope: 'guild',
        guildId,
        name,
        isSystem: false,
        createdAt: new Date().toISOString(),
      }).execute()

      return c.json({ id: roleId, name, scope: 'guild', guildId, isSystem: false }, 201)
    });
const deleteRoleHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), async (c) => {
      const { id: guildId, roleId } = c.req.param() as { [key: string]: string } as Record<string, string>
      const db = drizzle(c.env.DB)

      const role = await db.select().from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.guildId, guildId)))
        .get()

      if (!role) return c.json({ error: '角色不存在' }, 404)
      if (role.isSystem) return c.json({ error: '系统角色不可删除' }, 403)

      await db.delete(roles).where(eq(roles.id, roleId)).execute()
      return c.json({ message: '角色已删除' })
    });
const assignRolePermissionHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), zValidator('json', AssignRolePermissionSchema), async (c) => {
        const { id: guildId, roleId } = c.req.param() as { [key: string]: string } as Record<string, string>
        const { permissionKey } = c.req.valid('json')
        const db = drizzle(c.env.DB)

        const perm = await db.select().from(permissions)
          .where(and(eq(permissions.key, permissionKey), eq(permissions.identityType, 'game')))
          .get()
        if (!perm) return c.json({ error: '权限不存在或类型不匹配' }, 404)

        const role = await db.select().from(roles)
          .where(and(eq(roles.id, roleId), eq(roles.guildId, guildId)))
          .get()
        if (!role) return c.json({ error: '角色不存在' }, 404)

        const existing = await db.select().from(rolePermissions)
          .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)))
          .get()
        if (!existing) {
          await db.insert(rolePermissions).values({ roleId, permissionId: perm.id }).execute()
        }

        return c.json({ message: '权限已分配' })
      });
const removeRolePermissionHandler = factory.createHandlers(guildPermMiddleware(['guild:manage']), async (c) => {
        const { roleId, permKey } = c.req.param() as { [key: string]: string } as Record<string, string>
        const db = drizzle(c.env.DB)

        const perm = await db.select().from(permissions).where(eq(permissions.key, permKey)).get()
        if (!perm) return c.json({ error: '权限不存在' }, 404)

        await db.delete(rolePermissions)
          .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)))
          .execute()

        return c.json({ message: '权限已撤销' })
      });


const routes = router
      .use('*', authMiddleware)
      .get('/:id/roles', ...listRolesHandler)
      .post('/:id/roles', ...createRoleHandler)
      .delete('/:id/roles/:roleId', ...deleteRoleHandler)
      .post('/:id/roles/:roleId/permissions', ...assignRolePermissionHandler)
      .delete('/:id/roles/:roleId/permissions/:permKey', ...removeRolePermissionHandler);

export { routes as guildRolesRouter }
