import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { guildMembers } from './guilds'

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  module: text('module').notNull(),
  action: text('action').notNull(),
  identityType: text('identity_type', { enum: ['platform', 'game'] }).notNull(),
  description: text('description'),
})

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['platform', 'guild'] }).notNull(),
  guildId: text('guild_id'),
  name: text('name').notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id),
})

export const userPlatformRoles = sqliteTable('user_platform_roles', {
  userId: text('user_id').notNull().references(() => users.id),
  roleId: text('role_id').notNull().references(() => roles.id),
})

export const guildMemberRoles = sqliteTable('guild_member_roles', {
  guildMemberId: text('guild_member_id').notNull().references(() => guildMembers.id),
  roleId: text('role_id').notNull().references(() => roles.id),
})
