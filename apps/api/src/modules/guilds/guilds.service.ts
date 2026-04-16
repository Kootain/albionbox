import { drizzle } from 'drizzle-orm/d1'
import { and, eq, isNotNull, ne, sql } from 'drizzle-orm'
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

type GuildSummaryRow = {
  id: string
  name: string
  server: 'asia' | 'eu' | 'us'
  albionGuildId: string | null
}

export async function findGuildByName(
  db: ReturnType<typeof drizzle>,
  name: string,
  options?: { limit?: number }
): Promise<GuildSummaryRow | null> {
  const query = name.trim()
  if (!query) return null
  const nameLower = query.toLowerCase()

  const exact = await db
    .select({
      id: guilds.id,
      name: guilds.name,
      server: guilds.server,
      albionGuildId: guilds.albionGuildId,
    })
    .from(guilds)
    .where(sql`lower(${guilds.name}) = ${nameLower}`)
    .all()

  const exactBest =
    exact.find((g) => typeof g.albionGuildId === 'string' && g.albionGuildId.length > 0) ?? exact[0]
  if (exactBest) return exactBest

  const partial = await db
    .select({
      id: guilds.id,
      name: guilds.name,
      server: guilds.server,
      albionGuildId: guilds.albionGuildId,
    })
    .from(guilds)
    .where(sql`lower(${guilds.name}) like ${`%${nameLower}%`}`)
    .limit(options?.limit ?? 20)
    .all()

  const partialBest =
    partial.find((g) => typeof g.albionGuildId === 'string' && g.albionGuildId.length > 0) ?? partial[0]
  return partialBest ?? null
}

export async function resolveAlbionGuildIdByName(
  db: ReturnType<typeof drizzle>,
  name: string
): Promise<string | null> {
  const query = name.trim()
  if (!query) return null
  const nameLower = query.toLowerCase()

  const exact = await db
    .select({ albionGuildId: guilds.albionGuildId })
    .from(guilds)
    .where(
      and(
        sql`lower(${guilds.name}) = ${nameLower}`,
        isNotNull(guilds.albionGuildId),
        ne(guilds.albionGuildId, ''),
      )
    )
    .get()

  if (exact?.albionGuildId) return exact.albionGuildId

  const partial = await db
    .select({ albionGuildId: guilds.albionGuildId })
    .from(guilds)
    .where(
      and(
        sql`lower(${guilds.name}) like ${`%${nameLower}%`}`,
        isNotNull(guilds.albionGuildId),
        ne(guilds.albionGuildId, ''),
      )
    )
    .limit(1)
    .get()

  return partial?.albionGuildId ?? null
}
