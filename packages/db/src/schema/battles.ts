import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { guilds } from './guilds'

export const battleRecords = sqliteTable('battle_records', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  externalId: text('external_id').notNull(),
  battleAt: text('battle_at').notNull(),
  participants: text('participants').notNull(),
  createdAt: text('created_at').notNull(),
})

export const battleDeaths = sqliteTable('battle_deaths', {
  id: text('id').primaryKey(),
  battleRecordId: text('battle_record_id').notNull().references(() => battleRecords.id),
  albionPlayerId: text('albion_player_id').notNull(),
  playerName: text('player_name').notNull(),
  equipment: text('equipment').notNull(),
  killedAt: text('killed_at').notNull(),
})
