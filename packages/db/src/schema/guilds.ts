import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
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
  joinedAt: text('joined_at').notNull(),
}, (t) => [
  check('guild_members_at_least_one_identity', sql`${t.userId} IS NOT NULL OR ${t.gameAccountId} IS NOT NULL`),
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
  kookGuildId: text('kook_guild_id'),
  dataCollectionGuildId: text('data_collection_guild_id'),
  updatedAt: text('updated_at').notNull(),
})
