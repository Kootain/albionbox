import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { gameAccounts } from './users'

export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  albionGuildId: text('albion_guild_id'),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).notNull().default('pending'),
  reviewNote: text('review_note'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
})

export const guildBindingTokens = sqliteTable('guild_binding_tokens', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})

export const guildMembers = sqliteTable('guild_members', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  userId: text('user_id').references(() => users.id),
  gameAccountId: text('game_account_id').references(() => gameAccounts.id),
  chestX: integer('chest_x'),
  chestY: integer('chest_y'),
  joinedAt: text('joined_at').notNull(),
}, (t) => [
  check('guild_members_at_least_one_identity', sql`${t.userId} IS NOT NULL OR ${t.gameAccountId} IS NOT NULL`),
])
