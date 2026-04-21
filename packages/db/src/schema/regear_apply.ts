import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const regearApplies = sqliteTable('regear_applies', {
  id: text('id').primaryKey(),
  msgId: text('msg_id').notNull(),
  msgUsername: text('msg_username'),
  msgUserid: text('msg_userid'),
  msgGuild: text('msg_guild'),
  msgChannel: text('msg_channel'),
  createTime: text('create_time').notNull(),
  lastStatusTime: text('last_status_time').notNull(),
  regearId: text('regear_id'),
  eventId: text('event_id'),
  battleId: text('battle_id'),
  regearTicketId: text('regear_ticket_id'),
  applyMeta: text('apply_meta'), // JSON string
  status: text('status', { enum: ['binding', 'bind_failed', 'pending_audit', 'pending_regear', 'reject', 'done'] }).notNull().default('binding'),
  victimName: text('victim_name'),
  victimGuild: text('victim_guild'),
  applyDetail: text('apply_detail'), // JSON string
  deletedAt: text('deleted_at'),
})
