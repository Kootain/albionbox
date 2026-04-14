import { sqliteTable, integer, text, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { guilds } from './guilds'

export const battles = sqliteTable('battles', {
  id: integer('id').notNull(),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  types: integer('types').notNull().default(0), // Bitmask
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ([
  primaryKey({ columns: [table.id, table.server, table.guildId] }),
  uniqueIndex('battles_id_server_guild_idx').on(table.id, table.server, table.guildId)
]))
