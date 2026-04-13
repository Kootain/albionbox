import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import {
  guilds,
  guildBindingTokens,
  roles,
  permissions,
  rolePermissions,
  guildMembers,
  guildMemberRoles,
} from '@albionbox/db'

const GAME_PERMISSION_KEYS = [
  'guild:manage',
  'guild:view',
  'regear:manage',
  'regear:approve',
  'regear:configure',
  'battle:view',
]

export async function createGuildWithAdmin(
  db: D1Database,
  params: {
    id: string,
    name: string
    server: 'asia' | 'eu' | 'us'
    ownerId: string
    activeGameAccountId: string
  }
) {
  const d = drizzle(db)
  const now = new Date().toISOString()

  await d.insert(guilds).values({
    id: params.id,
    albionGuildId: params.id,
    name: params.name,
    server: params.server,
    status: 'pending',
    ownerId: params.ownerId,
    createdAt: now,
  }).execute()

  const bindingToken = crypto.randomUUID()
  await d.insert(guildBindingTokens).values({
    id: crypto.randomUUID(),
    guildId: params.id,
    token: bindingToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).execute()

  const adminRoleId = crypto.randomUUID()
  await d.insert(roles).values({
    id: adminRoleId,
    scope: 'guild',
    guildId: params.id,
    name: 'guild_admin',
    isSystem: true,
    createdAt: now,
  }).execute()

  const gamePerms = await d
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.identityType, 'game'))
    .all()

  if (gamePerms.length > 0) {
    await Promise.all(
      gamePerms.map(p =>
        d.insert(rolePermissions).values({ roleId: adminRoleId, permissionId: p.id }).execute()
      )
    )
  }

  const memberId = crypto.randomUUID()
  await d.insert(guildMembers).values({
    id: memberId,
    guildId: params.id,
    gameAccountId: params.activeGameAccountId,
    joinedAt: now,
  }).execute()

  await d.insert(guildMemberRoles).values({ guildMemberId: memberId, roleId: adminRoleId }).execute()

  return { guildId: params.id, bindingToken }
}
