import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  passwordUpdatedAt: integer('password_updated_at', { mode: 'timestamp' }),
  currentGameCharacterId: text('current_game_character_id'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const oauthAccounts = sqliteTable('oauth_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['kook', 'discord'] }).notNull(),
  providerAccountId: text('provider_account_id'),
  providerAccountName: text('provider_account_name'),
  status: text('status', { enum: ['active', 'unbound'] }).notNull().default('active'),
  lastBoundAt: integer('last_bound_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  unboundAt: integer('unbound_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => {
  return {
    unqOauthUserProvider: uniqueIndex('unq_oauth_user_provider').on(table.userId, table.provider),
    unqOauthProviderAccount: uniqueIndex('unq_oauth_provider_account').on(table.provider, table.providerAccountId),
  };
});

export const gameCharacterBindingApplications = sqliteTable('game_character_binding_applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  server: text('server', { enum: ['asia', 'europe', 'america'] }).notNull(),
  gameAccountId: text('game_account_id').notNull(),
  gameCharacterName: text('game_character_name'),
  bindingToken: text('binding_token').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewNote: text('review_note'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => {
  return {
    unqGameAccountBinding: uniqueIndex('unq_game_account_binding').on(table.userId, table.server, table.gameAccountId),
    unqGameBindingToken: uniqueIndex('unq_game_binding_token').on(table.bindingToken),
  };
});

export const gameCharacters = sqliteTable('game_characters', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => gameCharacterBindingApplications.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  server: text('server', { enum: ['asia', 'europe', 'america'] }).notNull(),
  gameAccountId: text('game_account_id').notNull(),
  characterName: text('character_name'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => {
  return {
    unqGameCharacterApplication: uniqueIndex('unq_game_character_application').on(table.applicationId),
    unqGameCharacterAccount: uniqueIndex('unq_game_character_account').on(table.server, table.gameAccountId),
  };
});
