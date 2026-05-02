import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { gameAccounts } from './users'

export const guilds = sqliteTable('guilds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).notNull().default('pending'),
  albionGuildId: text('albion_guild_id'),
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
  provider: text('provider', { enum: ['kook', 'discord'] }),
  providerId: text('provider_id'),
  providerName: text('provider_name'),
  joinedAt: text('joined_at').notNull(),
}, (t) => [
  check('guild_members_at_least_one_identity', sql`${t.userId} IS NOT NULL OR ${t.gameAccountId} IS NOT NULL`),
  index('guild_members_guild_id_idx').on(t.guildId),
  index('guild_members_guild_game_account_id_idx').on(t.guildId, t.gameAccountId),
  index('guild_members_guild_provider_id_idx').on(t.guildId, t.provider, t.providerId),
  uniqueIndex('guild_members_guild_provider_identity_unique').on(t.guildId, t.provider, t.providerId),
  uniqueIndex('guild_members_guild_game_account_unique').on(t.guildId, t.gameAccountId),
])

export const guildSettings = sqliteTable('guild_settings', {
  guildId: text('guild_id').primaryKey().references(() => guilds.id),
  regearConfig: text('regear_config', { mode: 'json' }).$type<{ 
    allowedSlots: string[];
    defaultPLevel?: number;
    policies?: {
      noRegear: { players: { id: string; name: string }[] };
      levelGroups: { id: string; name: string; maxPLevel: number; players: { id: string; name: string }[] }[];
    }
  }>(),
  chestRooms: text('chest_rooms', { mode: 'json' }).$type<{
    id: string;
    name: string;
    width: number;
    height: number;
    assignments: {
      x: number;
      y: number;
      playerId: string;
      playerName: string;
    }[];
  }[]>(),
  settlementPreset: text('settlement_preset', { mode: 'json' }).$type<any>(),
  kookGuildId: text('kook_guild_id'),
  dataCollectionGuildId: text('data_collection_guild_id'),
  updatedAt: text('updated_at').notNull(),
})
