import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { guilds } from './guilds'
import { battleRecords } from './battles'
import { battleDeaths } from './battles'
import { users } from './users'

export const regearSessions = sqliteTable('regear_sessions', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  status: text('status', { enum: ['active', 'completed'] }).notNull().default('active'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
})

export const regearSessionBattles = sqliteTable('regear_session_battles', {
  sessionId: text('session_id').notNull().references(() => regearSessions.id),
  battleRecordId: text('battle_record_id').notNull().references(() => battleRecords.id),
}, (t) => [
  primaryKey({ columns: [t.sessionId, t.battleRecordId] }),
])

export const regearRecords = sqliteTable('regear_records', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => regearSessions.id),
  battleDeathId: text('battle_death_id').notNull().references(() => battleDeaths.id),
  status: text('status', { enum: ['draft', 'pending', 'approved', 'rejected', 'done'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull(),
})

export const regearApprovalLogs = sqliteTable('regear_approval_logs', {
  id: text('id').primaryKey(),
  regearRecordId: text('regear_record_id').notNull().references(() => regearRecords.id),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  operatorId: text('operator_id'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  note: text('note'),
  createdAt: text('created_at').notNull(),
})

export const regearApprovalRules = sqliteTable('regear_approval_rules', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(0),
  condition: text('condition').notNull(),
  action: text('action', { enum: ['approve', 'reject'] }).notNull(),
  createdAt: text('created_at').notNull(),
})
