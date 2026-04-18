import { sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { guilds } from './guilds'
import { users } from './users'

export const regearTickets = sqliteTable('regear_tickets', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  config: text('config').notNull(), // JSON string
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  deletedAt: text('deleted_at'), // Soft delete timestamp
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ([
  index('regear_tickets_guild_id_idx').on(table.guildId),
]))

export const regearTicketBattles = sqliteTable('regear_ticket_battles', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => regearTickets.id),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  battleId: text('battle_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('regear_ticket_battles_ticket_id_idx').on(table.ticketId),
  index('regear_ticket_battles_guild_id_idx').on(table.guildId),
  index('regear_ticket_battles_battle_id_idx').on(table.battleId),
  uniqueIndex('regear_ticket_battles_ticket_battle_idx').on(table.ticketId, table.battleId),
]))

export const regears = sqliteTable('regears', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => regearTickets.id),
  eventId: text('event_id').notNull(),
  battleId: text('battle_id'),
  status: text('status', { enum: ['pending_review', 'excluded', 'rejected', 'pending_regear', 'completed'] }).notNull().default('pending_review'),
  comment: text('comment'),
  regearedSlots: text('regeared_slots'),
  server: text('server', { enum: ['asia', 'eu', 'us'] }).notNull(),
  playerName: text('player_name').notNull().default(''),
  deletedAt: text('deleted_at'), // Soft delete timestamp
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ([
  index('regears_ticket_id_idx').on(table.ticketId),
  index('regears_player_server_idx').on(table.playerName, table.server),
]))

export const regearLogs = sqliteTable('regear_logs', {
  id: text('id').primaryKey(),
  regearId: text('regear_id').notNull().references(() => regears.id),
  action: text('action').notNull(),
  operatorId: text('operator_id').notNull().references(() => users.id),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('regear_logs_regear_id_idx').on(table.regearId),
]))
