import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  activeGameAccountId: text('active_game_account_id'),
  sessionsVersion: integer('sessions_version').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const emailVerifications = sqliteTable('email_verifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  verifiedAt: text('verified_at'),
})

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})

export const gameAccounts = sqliteTable('game_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  gameId: text('game_id').notNull(),
  albionPlayerId: text('albion_player_id'),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
})

export const bindingTokens = sqliteTable('binding_tokens', {
  id: text('id').primaryKey(),
  gameAccountId: text('game_account_id').notNull().references(() => gameAccounts.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})
