import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
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
  userId: text('user_id').references(() => users.id),
  username: text('username').notNull(),
  albionPlayerId: text('albion_player_id').default(''),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  status: text('status', { enum: ['idle', 'verifing', 'verified'] }).notNull().default('idle'),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('game_accounts_user_id_idx').on(table.userId),
  uniqueIndex('game_accounts_username_server_idx').on(table.username, table.server)
]))

export const bindingTokens = sqliteTable('binding_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  username: text('username').notNull(),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  status: text('status', { enum: ['pending', 'rejected', 'accepted', 'cancelled'] }).notNull().default('pending'),
  reviewNote: text('review_note'),
}, (table) => ([
  index('binding_tokens_user_id_idx').on(table.userId),
  index('binding_tokens_username_server_userId_idx').on(table.username, table.server, table.userId),
]))

export const thirdPartyAccounts = sqliteTable('third_party_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider', { enum: ['kook', 'discord'] }).notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  providerUsername: text('provider_username').notNull(),
  providerAvatar: text('provider_avatar'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ([
  uniqueIndex('third_party_provider_account_id_idx').on(table.provider, table.providerAccountId),
  uniqueIndex('third_party_user_provider_idx').on(table.userId, table.provider)
]))
