import type { Context, MiddlewareHandler } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, inArray } from 'drizzle-orm'
import {
  permissions,
  roles,
  rolePermissions,
  userPlatformRoles,
  guildMembers,
  guildMemberRoles,
} from '@albionbox/db'

export function platformPermMiddleware(permKey: string): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user' as never) as { id: string } | undefined
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const db = drizzle(c.env.DB)

    const result = await db
      .select({ permKey: permissions.key })
      .from(userPlatformRoles)
      .innerJoin(roles, eq(userPlatformRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(userPlatformRoles.userId, user.id),
          eq(permissions.key, permKey),
          eq(permissions.identityType, 'platform'),
        )
      )
      .get()

    if (!result) return c.json({ error: 'Forbidden' }, 403)
    await next()
  }
}

export function guildPermMiddleware(
  permKeys: string[],
  mode: 'ALL' | 'ANY' = 'ALL'
): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user' as never) as {
      id: string
      activeGameAccountId: string | null
    } | undefined
    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    if (!user.activeGameAccountId) {
      return c.json({ error: '请先切换游戏角色后再执行此操作' }, 403)
    }

    const guildId = c.req.param('guildId') ?? c.req.param('id')
    if (!guildId) return c.json({ error: 'Missing guildId' }, 400)

    const db = drizzle(c.env.DB)

    const member = await db
      .select({ id: guildMembers.id })
      .from(guildMembers)
      .where(
        and(
          eq(guildMembers.guildId, guildId),
          eq(guildMembers.gameAccountId, user.activeGameAccountId),
        )
      )
      .get()

    if (!member) return c.json({ error: 'Forbidden' }, 403)

    const grantedPerms = await db
      .select({ permKey: permissions.key })
      .from(guildMemberRoles)
      .innerJoin(roles, eq(guildMemberRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(guildMemberRoles.guildMemberId, member.id),
          inArray(permissions.key, permKeys),
          eq(permissions.identityType, 'game'),
        )
      )
      .all()

    const grantedKeys = grantedPerms.map(r => r.permKey)

    const allowed =
      mode === 'ALL'
        ? permKeys.every(k => grantedKeys.includes(k))
        : permKeys.some(k => grantedKeys.includes(k))

    if (!allowed) return c.json({ error: 'Forbidden' }, 403)
    await next()
  }
}
