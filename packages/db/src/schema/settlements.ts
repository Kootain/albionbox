import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
import { guilds } from './guilds'
import { users } from './users'

export const settlementCycles = sqliteTable('settlement_cycles', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  rankingIds: text('ranking_ids').notNull(),
  config: text('config').notNull(),
  createdAt: text('created_at').notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id),
}, (table) => ([
  index('settlement_cycles_guild_id_idx').on(table.guildId),
  index('settlement_cycles_guild_date_idx').on(table.guildId, table.startDate, table.endDate),
]))

export const settlementDetails = sqliteTable('settlement_details', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  settlementId: text('settlement_id').notNull().references(() => settlementCycles.id),
  recipientKey: text('recipient_key').notNull(),
  rewardType: text('reward_type').notNull(),
  subType: text('sub_type').notNull(),
  username: text('username'),
  platformId: text('platform_id'),
  platformType: text('platform_type'),
  coinAmount: integer('coin_amount').notNull(),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  paidAt: text('paid_at'),
  paidByUserId: text('paid_by_user_id').references(() => users.id),
  detail: text('detail').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('settlement_details_guild_id_idx').on(table.guildId),
  index('settlement_details_settlement_id_idx').on(table.settlementId),
  index('settlement_details_recipient_idx').on(table.settlementId, table.recipientKey),
  index('settlement_details_reward_idx').on(table.settlementId, table.rewardType, table.subType),
  index('settlement_details_paid_idx').on(table.settlementId, table.isPaid),
]))

