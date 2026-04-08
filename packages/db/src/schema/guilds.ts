import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { gameCharacters, users } from './users';

export const guildRegistrationApplications = sqliteTable(
  'guild_registration_applications',
  {
    id: text('id').primaryKey(),
    applicantUserId: text('applicant_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    guildName: text('guild_name').notNull(),
    server: text('server', { enum: ['asia', 'europe', 'america'] }).notNull(),
    bindingToken: text('binding_token').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildApplication: uniqueIndex('unq_guild_application').on(table.applicantUserId, table.server, table.guildName),
      unqGuildApplicationToken: uniqueIndex('unq_guild_application_token').on(table.bindingToken),
    };
  }
);

export const guilds = sqliteTable(
  'guilds',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => guildRegistrationApplications.id, { onDelete: 'cascade' }),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    guildName: text('guild_name').notNull(),
    server: text('server', { enum: ['asia', 'europe', 'america'] }).notNull(),
    bindingToken: text('binding_token').notNull(),
    status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildApplicationId: uniqueIndex('unq_guild_application_id').on(table.applicationId),
      unqGuildNameServer: uniqueIndex('unq_guild_name_server').on(table.server, table.guildName),
      unqGuildBindingToken: uniqueIndex('unq_guild_binding_token').on(table.bindingToken),
    };
  }
);

export const guildPermissions = sqliteTable(
  'guild_permissions',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key').notNull(),
    permissionName: text('permission_name').notNull(),
    description: text('description'),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildPermissionKey: uniqueIndex('unq_guild_permission_key').on(table.guildId, table.permissionKey),
    };
  }
);

export const guildRoles = sqliteTable(
  'guild_roles',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    roleName: text('role_name').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    isDefaultAdmin: integer('is_default_admin', { mode: 'boolean' }).notNull().default(false),
    canDelete: integer('can_delete', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildRoleName: uniqueIndex('unq_guild_role_name').on(table.guildId, table.roleName),
    };
  }
);

export const guildRolePermissions = sqliteTable(
  'guild_role_permissions',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => guildRoles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => guildPermissions.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildRolePermission: uniqueIndex('unq_guild_role_permission').on(table.roleId, table.permissionId),
    };
  }
);

export const guildMembers = sqliteTable(
  'guild_members',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    bindingType: text('binding_type', { enum: ['platform_user', 'game_character'] }).notNull(),
    platformUserId: text('platform_user_id').references(() => users.id, { onDelete: 'set null' }),
    gameCharacterId: text('game_character_id').references(() => gameCharacters.id, { onDelete: 'set null' }),
    invitedByUserId: text('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
    joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildMemberPlatformUser: uniqueIndex('unq_guild_member_platform_user').on(table.guildId, table.platformUserId),
      unqGuildMemberGameCharacter: uniqueIndex('unq_guild_member_game_character').on(table.guildId, table.gameCharacterId),
    };
  }
);

export const guildMemberRoles = sqliteTable(
  'guild_member_roles',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id')
      .notNull()
      .references(() => guildMembers.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => guildRoles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildMemberRole: uniqueIndex('unq_guild_member_role').on(table.memberId, table.roleId),
    };
  }
);

export const guildMemberBoxes = sqliteTable(
  'guild_member_boxes',
  {
    id: text('id').primaryKey(),
    guildMemberId: text('guild_member_id')
      .notNull()
      .references(() => guildMembers.id, { onDelete: 'cascade' }),
    coordinateX: integer('coordinate_x').notNull(),
    coordinateY: integer('coordinate_y').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildMemberBox: uniqueIndex('unq_guild_member_box').on(table.guildMemberId),
    };
  }
);
