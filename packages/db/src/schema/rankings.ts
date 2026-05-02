import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

export const guildRankings = sqliteTable('guild_rankings', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  rankingType: text('ranking_type').notNull(),
  collectedAt: text('collected_at').notNull(),
  data: text('data').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('guild_rankings_type_idx').on(table.rankingType),
  index('guild_rankings_composite_idx').on(table.guildId, table.rankingType, table.collectedAt),
]))
