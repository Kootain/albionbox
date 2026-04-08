import type { MiddlewareHandler } from 'hono';
import { and, eq, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  guildMemberRoles,
  guildMembers,
  guildPermissions,
  guildRolePermissions,
  guildRoles,
  guilds,
} from '@albionbox/db/src/schema/guilds';
import { gameCharacters, users } from '@albionbox/db/src/schema/users';

export type GuildPermissionKey =
  | 'guild:view'
  | 'guild:manage_roles'
  | 'guild:manage_members'
  | 'guild:manage_boxes'
  | 'battle:manage_records'
  | 'reimbursement:manage_sessions'
  | 'reimbursement:view_summary';

export type GuildAccessContext = {
  guild: typeof guilds.$inferSelect;
  user: typeof users.$inferSelect;
  isPlatformAdmin: boolean;
  memberships: Array<typeof guildMembers.$inferSelect>;
  roleIds: string[];
  permissionKeys: GuildPermissionKey[];
};

export const DEFAULT_GUILD_PERMISSIONS: Array<{
  key: GuildPermissionKey;
  name: string;
  description: string;
}> = [
  { key: 'guild:view', name: '查看工会', description: '查看工会基础信息、角色和成员信息' },
  { key: 'guild:manage_roles', name: '管理工会角色', description: '创建、编辑和删除工会角色及权限' },
  { key: 'guild:manage_members', name: '管理工会成员', description: '添加成员、调整成员角色与移除成员' },
  { key: 'guild:manage_boxes', name: '管理箱子坐标', description: '维护成员箱子坐标分配' },
  { key: 'battle:manage_records', name: '管理战斗记录', description: '导入和维护工会战斗记录' },
  { key: 'reimbursement:manage_sessions', name: '管理补装会话', description: '创建和审批补装 session' },
  { key: 'reimbursement:view_summary', name: '查看补装汇总', description: '查看补装装备汇总与成员视图' },
];

export const getGuildAccessContext = async (
  db: ReturnType<typeof drizzle>,
  userId: string,
  guildId: string
): Promise<GuildAccessContext | null> => {
  const [userRecord, guildRecord, userGameCharacters] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(guilds).where(eq(guilds.id, guildId)).get(),
    db.select().from(gameCharacters).where(eq(gameCharacters.userId, userId)).all(),
  ]);

  if (!userRecord || !guildRecord) {
    return null;
  }

  const membershipConditions = [eq(guildMembers.platformUserId, userId)];

  if (userGameCharacters.length > 0) {
    membershipConditions.push(inArray(guildMembers.gameCharacterId, userGameCharacters.map((gameCharacter) => gameCharacter.id)));
  }

  const memberCondition = membershipConditions.length === 1 ? membershipConditions[0] : or(...membershipConditions);

  const memberships = userRecord.isAdmin
    ? []
    : await db
        .select()
        .from(guildMembers)
        .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.status, 'active'), memberCondition))
        .all();

  if (!userRecord.isAdmin && memberships.length === 0) {
    return null;
  }

  const memberIds = memberships.map((membership) => membership.id);
  const memberRoleRows =
    memberIds.length > 0
      ? await db.select().from(guildMemberRoles).where(inArray(guildMemberRoles.memberId, memberIds)).all()
      : [];
  const roleIds = Array.from(new Set(memberRoleRows.map((memberRole) => memberRole.roleId)));
  const rolePermissionRows =
    roleIds.length > 0 ? await db.select().from(guildRolePermissions).where(inArray(guildRolePermissions.roleId, roleIds)).all() : [];
  const permissionIds = Array.from(new Set(rolePermissionRows.map((rolePermission) => rolePermission.permissionId)));
  const permissionRows =
    permissionIds.length > 0 ? await db.select().from(guildPermissions).where(inArray(guildPermissions.id, permissionIds)).all() : [];
  const permissionKeys = userRecord.isAdmin
    ? DEFAULT_GUILD_PERMISSIONS.map((permission) => permission.key)
    : Array.from(new Set(permissionRows.map((permission) => permission.permissionKey as GuildPermissionKey)));

  return {
    guild: guildRecord,
    user: userRecord,
    isPlatformAdmin: userRecord.isAdmin,
    memberships,
    roleIds,
    permissionKeys,
  };
};

const resolveGuildAccess = async (
  c: any
): Promise<
  | {
      ok: false;
      response: Response;
    }
  | {
      ok: true;
      guildAccess: GuildAccessContext;
    }
> => {
  const guildId = c.req.param('guild_id');

  if (!guildId) {
    return { ok: false as const, response: c.json({ error: '缺少工会 ID' }, 400) };
  }

  const db = drizzle(c.env.DB);
  const guildAccess = await getGuildAccessContext(db, c.get('userId'), guildId);

  if (!guildAccess) {
    return { ok: false as const, response: c.json({ error: '工会不存在或当前用户无访问权限' }, 404) };
  }

  return { ok: true as const, guildAccess };
};

export const requireGuildPermission = (requiredPermissionKeys: GuildPermissionKey[]): MiddlewareHandler<any> => async (c, next) => {
  const resolved = await resolveGuildAccess(c);

  if (!resolved.ok) {
    return resolved.response;
  }

  const guildAccess = resolved.guildAccess;

  if (
    !guildAccess.isPlatformAdmin &&
    requiredPermissionKeys.some((permissionKey) => !guildAccess.permissionKeys.includes(permissionKey))
  ) {
    return c.json({ error: '当前成员缺少所需权限' }, 403);
  }

  c.set('guildAccess', guildAccess);
  await next();
};

export const requireAnyGuildPermission = (candidatePermissionKeys: GuildPermissionKey[]): MiddlewareHandler<any> => async (c, next) => {
  const resolved = await resolveGuildAccess(c);

  if (!resolved.ok) {
    return resolved.response;
  }

  const guildAccess = resolved.guildAccess;

  if (
    !guildAccess.isPlatformAdmin &&
    !candidatePermissionKeys.some((permissionKey) => guildAccess.permissionKeys.includes(permissionKey))
  ) {
    return c.json({ error: '当前成员缺少所需权限' }, 403);
  }

  c.set('guildAccess', guildAccess);
  await next();
};
