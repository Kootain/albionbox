import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { CreateRoleSchema, AssignRolePermissionSchema } from '@albionbox/shared'
import { roles, rolePermissions, permissions } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.get('/:id/roles', guildPermMiddleware(['guild:view']), async (c) => {
  const guildId = c.req.param('id')
  const db = drizzle(c.env.DB)
  const result = await db.select().from(roles)
    .where(and(eq(roles.scope, 'guild'), eq(roles.guildId, guildId)))
    .all()
  return c.json(result)
})

router.post('/:id/roles', guildPermMiddleware(['guild:manage']), zValidator('json', CreateRoleSchema), async (c) => {
  const guildId = c.req.param('id')
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
})

router.delete('/:id/roles/:roleId', guildPermMiddleware(['guild:manage']), async (c) => {
  const { id: guildId, roleId } = c.req.param()
  const db = drizzle(c.env.DB)

  const role = await db.select().from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.guildId, guildId)))
    .get()

  if (!role) return c.json({ error: '角色不存在' }, 404)
  if (role.isSystem) return c.json({ error: '系统角色不可删除' }, 403)

  await db.delete(roles).where(eq(roles.id, roleId)).execute()
  return c.json({ message: '角色已删除' })
})

router.post(
  '/:id/roles/:roleId/permissions',
  guildPermMiddleware(['guild:manage']),
  zValidator('json', AssignRolePermissionSchema),
  async (c) => {
    const { id: guildId, roleId } = c.req.param()
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
  }
)

router.delete(
  '/:id/roles/:roleId/permissions/:permKey',
  guildPermMiddleware(['guild:manage']),
  async (c) => {
    const { roleId, permKey } = c.req.param()
    const db = drizzle(c.env.DB)

    const perm = await db.select().from(permissions).where(eq(permissions.key, permKey)).get()
    if (!perm) return c.json({ error: '权限不存在' }, 404)

    await db.delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, perm.id)))
      .execute()

    return c.json({ message: '权限已撤销' })
  }
)

export { router as guildRolesRouter }
