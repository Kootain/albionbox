import { and, desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  guildMemberBoxes,
  guildMemberRoles,
  guildMembers,
  guildPermissions,
  guildRegistrationApplications,
  guildRolePermissions,
  guildRoles,
  guilds,
} from '@albionbox/db/src/schema/guilds';
import { gameCharacters, users } from '@albionbox/db/src/schema/users';
import { DEFAULT_GUILD_PERMISSIONS, type GuildAccessContext, type GuildPermissionKey } from '../shared/guild-access';
import { AppError } from '../shared/errors';
import { createEntityId, normalizeOptionalText } from '../shared/utils';

type DbClient = ReturnType<typeof drizzle>;

const createGuildBindingToken = () => `guild_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;

export const buildGuildSnapshot = async (db: DbClient, guildId: string) => {
  const [guildRecord, permissionRows, roleRows, memberRows] = await Promise.all([
    db.select().from(guilds).where(eq(guilds.id, guildId)).get(),
    db.select().from(guildPermissions).where(eq(guildPermissions.guildId, guildId)).all(),
    db.select().from(guildRoles).where(eq(guildRoles.guildId, guildId)).all(),
    db.select().from(guildMembers).where(eq(guildMembers.guildId, guildId)).all(),
  ]);

  if (!guildRecord) {
    return null;
  }

  const roleIds = roleRows.map((role) => role.id);
  const memberIds = memberRows.map((member) => member.id);
  const platformUserIds = Array.from(
    new Set(memberRows.map((member) => member.platformUserId).filter((platformUserId): platformUserId is string => Boolean(platformUserId)))
  );
  const gameCharacterIds = Array.from(
    new Set(memberRows.map((member) => member.gameCharacterId).filter((gameCharacterId): gameCharacterId is string => Boolean(gameCharacterId)))
  );

  const [rolePermissionRows, memberRoleRows, boxRows, platformUsers, gameCharacterRows] = await Promise.all([
    roleIds.length > 0 ? db.select().from(guildRolePermissions).where(inArray(guildRolePermissions.roleId, roleIds)).all() : [],
    memberIds.length > 0 ? db.select().from(guildMemberRoles).where(inArray(guildMemberRoles.memberId, memberIds)).all() : [],
    memberIds.length > 0 ? db.select().from(guildMemberBoxes).where(inArray(guildMemberBoxes.guildMemberId, memberIds)).all() : [],
    platformUserIds.length > 0 ? db.select().from(users).where(inArray(users.id, platformUserIds)).all() : [],
    gameCharacterIds.length > 0 ? db.select().from(gameCharacters).where(inArray(gameCharacters.id, gameCharacterIds)).all() : [],
  ]);

  const permissionMap = new Map(permissionRows.map((permission) => [permission.id, permission]));
  const rolePermissionMap = new Map<string, typeof permissionRows>();

  for (const role of roleRows) {
    const permissions = rolePermissionRows
      .filter((rolePermission) => rolePermission.roleId === role.id)
      .map((rolePermission) => permissionMap.get(rolePermission.permissionId))
      .filter((permission): permission is (typeof permissionRows)[number] => Boolean(permission));
    rolePermissionMap.set(role.id, permissions);
  }

  const roles = roleRows.map((role) => ({
    ...role,
    permissions: rolePermissionMap.get(role.id) ?? [],
    permissionKeys: (rolePermissionMap.get(role.id) ?? []).map((permission) => permission.permissionKey),
  }));

  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const platformUserMap = new Map(platformUsers.map((user) => [user.id, user]));
  const gameCharacterMap = new Map(gameCharacterRows.map((gameCharacter) => [gameCharacter.id, gameCharacter]));
  const boxMap = new Map(boxRows.map((box) => [box.guildMemberId, box]));

  const members = memberRows.map((member) => {
    const assignedRoleIds = memberRoleRows
      .filter((memberRole) => memberRole.memberId === member.id)
      .map((memberRole) => memberRole.roleId);

    return {
      ...member,
      roles: assignedRoleIds.map((roleId) => roleMap.get(roleId)).filter((role) => Boolean(role)),
      roleIds: assignedRoleIds,
      platformUser: member.platformUserId ? platformUserMap.get(member.platformUserId) ?? null : null,
      gameCharacter: member.gameCharacterId ? gameCharacterMap.get(member.gameCharacterId) ?? null : null,
      boxCoordinate: boxMap.get(member.id) ?? null,
    };
  });

  return {
    guild: guildRecord,
    permissions: permissionRows,
    roles,
    members,
  };
};

const ensureGuildRoleIds = async (db: DbClient, guildId: string, roleIds: string[]) => {
  if (roleIds.length === 0) {
    return [];
  }

  const roleRows = await db
    .select()
    .from(guildRoles)
    .where(and(eq(guildRoles.guildId, guildId), inArray(guildRoles.id, roleIds)))
    .all();

  if (roleRows.length !== roleIds.length) {
    return null;
  }

  return roleRows;
};

const replaceGuildMemberRoles = async (db: DbClient, memberId: string, roleIds: string[]) => {
  const existingMemberRoles = await db.select().from(guildMemberRoles).where(eq(guildMemberRoles.memberId, memberId)).all();

  for (const memberRole of existingMemberRoles) {
    await db.delete(guildMemberRoles).where(eq(guildMemberRoles.id, memberRole.id));
  }

  for (const roleId of roleIds) {
    await db.insert(guildMemberRoles).values({
      id: createEntityId('guild_member_role'),
      memberId,
      roleId,
    });
  }
};

const ensureNotRemovingLastAdminMember = async (
  db: DbClient,
  guildId: string,
  memberId: string,
  nextRoleIds?: string[],
  isDeleting = false
) => {
  const adminRole = await db
    .select()
    .from(guildRoles)
    .where(and(eq(guildRoles.guildId, guildId), eq(guildRoles.isDefaultAdmin, true)))
    .get();

  if (!adminRole) {
    return true;
  }

  const currentAdminAssignment = await db
    .select()
    .from(guildMemberRoles)
    .where(and(eq(guildMemberRoles.memberId, memberId), eq(guildMemberRoles.roleId, adminRole.id)))
    .get();

  if (!currentAdminAssignment) {
    return true;
  }

  if (!isDeleting && nextRoleIds?.includes(adminRole.id)) {
    return true;
  }

  const adminAssignments = await db
    .select()
    .from(guildMemberRoles)
    .where(eq(guildMemberRoles.roleId, adminRole.id))
    .all();

  return adminAssignments.length > 1;
};

const requireGuildSnapshot = async (db: DbClient, guildId: string) => {
  const snapshot = await buildGuildSnapshot(db, guildId);

  if (!snapshot) {
    throw new AppError(404, '工会不存在');
  }

  return snapshot;
};

export const listGuildRegistrationApplications = async (db: DbClient, userId: string) => {
  const rows = await db
    .select()
    .from(guildRegistrationApplications)
    .where(eq(guildRegistrationApplications.applicantUserId, userId))
    .orderBy(desc(guildRegistrationApplications.createdAt))
    .all();

  return { guildRegistrationApplications: rows };
};

export const createGuildRegistrationApplication = async (
  db: DbClient,
  userId: string,
  payload: {
    guildName: string;
    server: 'asia' | 'europe' | 'america';
  }
) => {
  const normalizedGuildName = payload.guildName.trim();
  const [existingGuild, sameGuildApplications] = await Promise.all([
    db.select().from(guilds).where(and(eq(guilds.server, payload.server), eq(guilds.guildName, normalizedGuildName))).get(),
    db
      .select()
      .from(guildRegistrationApplications)
      .where(and(eq(guildRegistrationApplications.server, payload.server), eq(guildRegistrationApplications.guildName, normalizedGuildName)))
      .all(),
  ]);

  if (existingGuild) {
    throw new AppError(409, '该工会已完成注册');
  }

  const userApplication = sameGuildApplications.find((application) => application.applicantUserId === userId);
  const otherPendingApplication = sameGuildApplications.find(
    (application) => application.status === 'pending' && application.applicantUserId !== userId
  );

  if (otherPendingApplication) {
    throw new AppError(409, '该工会已有待审核申请，请等待平台管理员处理');
  }

  if (userApplication?.status === 'approved') {
    throw new AppError(409, '该工会申请已审核通过');
  }

  if (userApplication?.status === 'pending') {
    return {
      message: '该工会已有待审核申请',
      application: userApplication,
    };
  }

  const now = new Date();
  const bindingToken = createGuildBindingToken();

  if (userApplication?.status === 'rejected') {
    await db
      .update(guildRegistrationApplications)
      .set({
        bindingToken,
        status: 'pending',
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: now,
      })
      .where(eq(guildRegistrationApplications.id, userApplication.id));

    return {
      message: '工会注册申请已重新提交，请等待平台管理员审核',
      application: await db
        .select()
        .from(guildRegistrationApplications)
        .where(eq(guildRegistrationApplications.id, userApplication.id))
        .get(),
    };
  }

  const applicationId = createEntityId('guild_app');

  await db.insert(guildRegistrationApplications).values({
    id: applicationId,
    applicantUserId: userId,
    guildName: normalizedGuildName,
    server: payload.server,
    bindingToken,
    status: 'pending',
    updatedAt: now,
  });

  return {
    message: '工会注册申请已提交，请等待平台管理员审核',
    application: await db
      .select()
      .from(guildRegistrationApplications)
      .where(eq(guildRegistrationApplications.id, applicationId))
      .get(),
  };
};

export const listAdminGuildRegistrationApplications = async (
  db: DbClient,
  status?: 'pending' | 'approved' | 'rejected'
) => {
  const rows = status
    ? await db
        .select()
        .from(guildRegistrationApplications)
        .where(eq(guildRegistrationApplications.status, status))
        .orderBy(desc(guildRegistrationApplications.createdAt))
        .all()
    : await db.select().from(guildRegistrationApplications).orderBy(desc(guildRegistrationApplications.createdAt)).all();

  return { guildRegistrationApplications: rows };
};

export const reviewGuildRegistrationApplication = async (
  db: DbClient,
  adminUserId: string,
  applicationId: string,
  payload: {
    status: 'approved' | 'rejected';
    reviewNote?: string;
  }
) => {
  const application = await db
    .select()
    .from(guildRegistrationApplications)
    .where(eq(guildRegistrationApplications.id, applicationId))
    .get();

  if (!application) {
    throw new AppError(404, '工会注册申请不存在');
  }

  if (application.status !== 'pending') {
    throw new AppError(409, '仅待审核申请可执行审核操作');
  }

  const now = new Date();
  let createdGuild: typeof guilds.$inferSelect | null = null;

  if (payload.status === 'approved') {
    const existingGuild = await db
      .select()
      .from(guilds)
      .where(and(eq(guilds.server, application.server), eq(guilds.guildName, application.guildName)))
      .get();

    if (existingGuild) {
      throw new AppError(409, '该工会已存在，无法重复通过审核');
    }

    const guildId = createEntityId('guild');

    await db.insert(guilds).values({
      id: guildId,
      applicationId: application.id,
      ownerUserId: application.applicantUserId,
      guildName: application.guildName,
      server: application.server,
      bindingToken: application.bindingToken,
      status: 'active',
      updatedAt: now,
    });

    const insertedPermissions = [];

    for (const permission of DEFAULT_GUILD_PERMISSIONS) {
      const permissionId = createEntityId('guild_permission');
      insertedPermissions.push({ id: permissionId, ...permission });
      await db.insert(guildPermissions).values({
        id: permissionId,
        guildId,
        permissionKey: permission.key,
        permissionName: permission.name,
        description: permission.description,
        isSystem: true,
      });
    }

    const adminRoleId = createEntityId('guild_role');

    await db.insert(guildRoles).values({
      id: adminRoleId,
      guildId,
      roleName: '管理员',
      isSystem: true,
      isDefaultAdmin: true,
      canDelete: false,
      updatedAt: now,
    });

    for (const permission of insertedPermissions) {
      await db.insert(guildRolePermissions).values({
        id: createEntityId('guild_role_permission'),
        roleId: adminRoleId,
        permissionId: permission.id,
      });
    }

    const guildMemberId = createEntityId('guild_member');

    await db.insert(guildMembers).values({
      id: guildMemberId,
      guildId,
      bindingType: 'platform_user',
      platformUserId: application.applicantUserId,
      invitedByUserId: adminUserId,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    await db.insert(guildMemberRoles).values({
      id: createEntityId('guild_member_role'),
      memberId: guildMemberId,
      roleId: adminRoleId,
    });

    createdGuild = (await db.select().from(guilds).where(eq(guilds.id, guildId)).get()) ?? null;
  }

  await db
    .update(guildRegistrationApplications)
    .set({
      status: payload.status,
      reviewNote: normalizeOptionalText(payload.reviewNote),
      reviewedBy: adminUserId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(guildRegistrationApplications.id, application.id));

  return {
    message: payload.status === 'approved' ? '工会注册申请已审核通过' : '工会注册申请已驳回',
    application: await db
      .select()
      .from(guildRegistrationApplications)
      .where(eq(guildRegistrationApplications.id, application.id))
      .get(),
    guild: createdGuild,
  };
};

export const getGuild = async (db: DbClient, guildId: string) => requireGuildSnapshot(db, guildId);

export const listGuildPermissions = async (db: DbClient, guildId: string) => {
  const permissions = await db.select().from(guildPermissions).where(eq(guildPermissions.guildId, guildId)).all();
  return { permissions };
};

export const listGuildRoles = async (db: DbClient, guildId: string) => {
  const snapshot = await requireGuildSnapshot(db, guildId);
  return { roles: snapshot.roles };
};

export const createGuildRole = async (
  db: DbClient,
  guildId: string,
  payload: {
    roleName: string;
    permissionKeys: GuildPermissionKey[];
  }
) => {
  const normalizedRoleName = payload.roleName.trim();
  const [existingRole, permissionRows] = await Promise.all([
    db
      .select()
      .from(guildRoles)
      .where(and(eq(guildRoles.guildId, guildId), eq(guildRoles.roleName, normalizedRoleName)))
      .get(),
    db
      .select()
      .from(guildPermissions)
      .where(and(eq(guildPermissions.guildId, guildId), inArray(guildPermissions.permissionKey, payload.permissionKeys)))
      .all(),
  ]);

  if (existingRole) {
    throw new AppError(409, '角色名称已存在');
  }

  if (permissionRows.length !== payload.permissionKeys.length) {
    throw new AppError(400, '存在无效的权限配置');
  }

  const roleId = createEntityId('guild_role');

  await db.insert(guildRoles).values({
    id: roleId,
    guildId,
    roleName: normalizedRoleName,
    isSystem: false,
    isDefaultAdmin: false,
    canDelete: true,
    updatedAt: new Date(),
  });

  for (const permission of permissionRows) {
    await db.insert(guildRolePermissions).values({
      id: createEntityId('guild_role_permission'),
      roleId,
      permissionId: permission.id,
    });
  }

  const snapshot = await requireGuildSnapshot(db, guildId);

  return {
    message: '工会角色已创建',
    role: snapshot.roles.find((item) => item.id === roleId) ?? null,
  };
};

export const updateGuildRole = async (
  db: DbClient,
  guildId: string,
  roleId: string,
  payload: {
    roleName?: string;
    permissionKeys?: GuildPermissionKey[];
  }
) => {
  const role = await db
    .select()
    .from(guildRoles)
    .where(and(eq(guildRoles.guildId, guildId), eq(guildRoles.id, roleId)))
    .get();

  if (!role) {
    throw new AppError(404, '角色不存在');
  }

  if (!role.canDelete || role.isDefaultAdmin) {
    throw new AppError(409, '默认管理员角色不可编辑');
  }

  const nextRoleName = payload.roleName?.trim();

  if (nextRoleName && nextRoleName !== role.roleName) {
    const duplicatedRole = await db
      .select()
      .from(guildRoles)
      .where(and(eq(guildRoles.guildId, guildId), eq(guildRoles.roleName, nextRoleName)))
      .get();

    if (duplicatedRole) {
      throw new AppError(409, '角色名称已存在');
    }
  }

  if (nextRoleName) {
    await db
      .update(guildRoles)
      .set({
        roleName: nextRoleName,
        updatedAt: new Date(),
      })
      .where(eq(guildRoles.id, role.id));
  }

  if (payload.permissionKeys) {
    const permissionRows = await db
      .select()
      .from(guildPermissions)
      .where(and(eq(guildPermissions.guildId, guildId), inArray(guildPermissions.permissionKey, payload.permissionKeys)))
      .all();

    if (permissionRows.length !== payload.permissionKeys.length) {
      throw new AppError(400, '存在无效的权限配置');
    }

    const existingRolePermissions = await db
      .select()
      .from(guildRolePermissions)
      .where(eq(guildRolePermissions.roleId, role.id))
      .all();

    for (const rolePermission of existingRolePermissions) {
      await db.delete(guildRolePermissions).where(eq(guildRolePermissions.id, rolePermission.id));
    }

    for (const permission of permissionRows) {
      await db.insert(guildRolePermissions).values({
        id: createEntityId('guild_role_permission'),
        roleId: role.id,
        permissionId: permission.id,
      });
    }
  }

  const snapshot = await requireGuildSnapshot(db, guildId);

  return {
    message: '工会角色已更新',
    role: snapshot.roles.find((item) => item.id === role.id) ?? null,
  };
};

export const deleteGuildRole = async (db: DbClient, guildId: string, roleId: string) => {
  const role = await db
    .select()
    .from(guildRoles)
    .where(and(eq(guildRoles.guildId, guildId), eq(guildRoles.id, roleId)))
    .get();

  if (!role) {
    throw new AppError(404, '角色不存在');
  }

  if (!role.canDelete || role.isDefaultAdmin) {
    throw new AppError(409, '默认管理员角色不可删除');
  }

  const assignedMembers = await db.select().from(guildMemberRoles).where(eq(guildMemberRoles.roleId, role.id)).all();

  if (assignedMembers.length > 0) {
    throw new AppError(409, '请先移除角色下的成员分配，再删除角色');
  }

  await db.delete(guildRoles).where(eq(guildRoles.id, role.id));

  return { message: '工会角色已删除' };
};

export const listGuildMembers = async (db: DbClient, guildId: string) => {
  const snapshot = await requireGuildSnapshot(db, guildId);
  return { members: snapshot.members };
};

export const addGuildMember = async (
  db: DbClient,
  guildId: string,
  guildAccess: GuildAccessContext,
  payload: {
    bindingType: 'platform_user' | 'game_character';
    userId?: string;
    gameCharacterId?: string;
    roleIds?: string[];
  }
) => {
  const roleRows = await ensureGuildRoleIds(db, guildId, payload.roleIds ?? []);

  if (!roleRows) {
    throw new AppError(400, '存在无效的角色配置');
  }

  const now = new Date();
  let memberId: string;

  if (payload.bindingType === 'platform_user') {
    const targetUser = await db.select().from(users).where(eq(users.id, payload.userId!)).get();

    if (!targetUser) {
      throw new AppError(404, '目标平台用户不存在');
    }

    const existingMember = await db
      .select()
      .from(guildMembers)
      .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.platformUserId, payload.userId!)))
      .get();

    if (existingMember?.status === 'active') {
      throw new AppError(409, '该平台用户已是工会成员');
    }

    if (existingMember) {
      memberId = existingMember.id;
      await db
        .update(guildMembers)
        .set({
          bindingType: payload.bindingType,
          status: 'active',
          invitedByUserId: guildAccess.user.id,
          joinedAt: now,
          updatedAt: now,
        })
        .where(eq(guildMembers.id, existingMember.id));
    } else {
      memberId = createEntityId('guild_member');
      await db.insert(guildMembers).values({
        id: memberId,
        guildId,
        bindingType: payload.bindingType,
        platformUserId: payload.userId!,
        invitedByUserId: guildAccess.user.id,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });
    }
  } else {
    const targetGameCharacter = await db
      .select()
      .from(gameCharacters)
      .where(eq(gameCharacters.id, payload.gameCharacterId!))
      .get();

    if (!targetGameCharacter) {
      throw new AppError(404, '目标游戏角色不存在');
    }

    if (targetGameCharacter.server !== guildAccess.guild.server) {
      throw new AppError(400, '基于游戏角色绑定成员时，角色服务器必须与工会一致');
    }

    const existingMember = await db
      .select()
      .from(guildMembers)
      .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.gameCharacterId, payload.gameCharacterId!)))
      .get();

    if (existingMember?.status === 'active') {
      throw new AppError(409, '该游戏角色已是工会成员');
    }

    if (existingMember) {
      memberId = existingMember.id;
      await db
        .update(guildMembers)
        .set({
          bindingType: payload.bindingType,
          status: 'active',
          invitedByUserId: guildAccess.user.id,
          joinedAt: now,
          updatedAt: now,
        })
        .where(eq(guildMembers.id, existingMember.id));
    } else {
      memberId = createEntityId('guild_member');
      await db.insert(guildMembers).values({
        id: memberId,
        guildId,
        bindingType: payload.bindingType,
        gameCharacterId: payload.gameCharacterId!,
        invitedByUserId: guildAccess.user.id,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });
    }
  }

  await replaceGuildMemberRoles(db, memberId, roleRows.map((role) => role.id));

  const snapshot = await requireGuildSnapshot(db, guildId);

  return {
    message: '工会成员已添加',
    member: snapshot.members.find((item) => item.id === memberId) ?? null,
  };
};

export const updateGuildMemberRoles = async (
  db: DbClient,
  guildId: string,
  memberId: string,
  roleIds: string[]
) => {
  const member = await db
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.id, memberId)))
    .get();

  if (!member) {
    throw new AppError(404, '工会成员不存在');
  }

  const roleRows = await ensureGuildRoleIds(db, guildId, roleIds);

  if (!roleRows) {
    throw new AppError(400, '存在无效的角色配置');
  }

  const canRemoveAdmin = await ensureNotRemovingLastAdminMember(db, guildId, memberId, roleRows.map((role) => role.id));

  if (!canRemoveAdmin) {
    throw new AppError(409, '工会至少需要保留一名管理员');
  }

  await replaceGuildMemberRoles(db, memberId, roleRows.map((role) => role.id));
  await db
    .update(guildMembers)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(guildMembers.id, memberId));

  const snapshot = await requireGuildSnapshot(db, guildId);

  return {
    message: '成员角色已更新',
    member: snapshot.members.find((item) => item.id === memberId) ?? null,
  };
};

export const updateGuildMemberBoxCoordinate = async (
  db: DbClient,
  guildId: string,
  memberId: string,
  payload: {
    coordinateX: number;
    coordinateY: number;
  }
) => {
  const member = await db
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.id, memberId)))
    .get();

  if (!member) {
    throw new AppError(404, '工会成员不存在');
  }

  const existingBox = await db
    .select()
    .from(guildMemberBoxes)
    .where(eq(guildMemberBoxes.guildMemberId, memberId))
    .get();

  const now = new Date();

  if (existingBox) {
    await db
      .update(guildMemberBoxes)
      .set({
        coordinateX: payload.coordinateX,
        coordinateY: payload.coordinateY,
        updatedAt: now,
      })
      .where(eq(guildMemberBoxes.id, existingBox.id));
  } else {
    await db.insert(guildMemberBoxes).values({
      id: createEntityId('guild_member_box'),
      guildMemberId: memberId,
      coordinateX: payload.coordinateX,
      coordinateY: payload.coordinateY,
      updatedAt: now,
    });
  }

  return {
    message: '成员箱子坐标已更新',
    boxCoordinate: await db.select().from(guildMemberBoxes).where(eq(guildMemberBoxes.guildMemberId, memberId)).get(),
  };
};

export const removeGuildMember = async (db: DbClient, guildId: string, memberId: string) => {
  const member = await db
    .select()
    .from(guildMembers)
    .where(and(eq(guildMembers.guildId, guildId), eq(guildMembers.id, memberId)))
    .get();

  if (!member) {
    throw new AppError(404, '工会成员不存在');
  }

  const canRemoveAdmin = await ensureNotRemovingLastAdminMember(db, guildId, memberId, undefined, true);

  if (!canRemoveAdmin) {
    throw new AppError(409, '工会至少需要保留一名管理员');
  }

  await db.delete(guildMembers).where(eq(guildMembers.id, memberId));

  return { message: '工会成员已移除' };
};
