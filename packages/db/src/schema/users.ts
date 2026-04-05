import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// 1. 用户主表 (Platform Account)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // 推荐使用 ULID 或 UUID
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 2. 第三方登录绑定表 (OAuth Accounts)
export const oauthAccounts = sqliteTable('oauth_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['kook', 'discord'] }).notNull(),
  providerAccountId: text('provider_account_id').notNull(), // Kook或Discord的唯一ID
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => {
  return {
    // 核心规则 1：一个主账户在特定三方平台内，只能绑定一个账号
    unqUserProvider: uniqueIndex('unq_user_provider').on(table.userId, table.provider),
    // 核心规则 2：同一个第三方账号，不能被多个主账户绑定
    unqProviderAccountId: uniqueIndex('unq_provider_account_id').on(table.provider, table.providerAccountId),
  };
});

// 3. 游戏角色绑定表 (Game Characters)
export const gameCharacters = sqliteTable('game_characters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  characterId: text('character_id').notNull().unique(), // Albion 官方 API 的角色 ID
  characterName: text('character_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});