import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { guildMembers, guilds } from './guilds';
import { gameCharacters, users } from './users';

export const reimbursementSessions = sqliteTable('reimbursement_sessions', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['open', 'completed', 'closed'] }).notNull().default('open'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  closedByUserId: text('closed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const reimbursementAutoApprovalRules = sqliteTable(
  'reimbursement_auto_approval_rules',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
    ruleName: text('rule_name').notNull(),
    description: text('description'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    priority: integer('priority').notNull().default(100),
    matchMode: text('match_mode', { enum: ['all', 'any'] }).notNull().default('all'),
    action: text('action', { enum: ['approve', 'reject'] }).notNull(),
    noteTemplate: text('note_template'),
    conditionsJson: text('conditions_json').notNull(),
    createdByUserId: text('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    updatedByUserId: text('updated_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildAutoApprovalRuleName: uniqueIndex('unq_guild_auto_approval_rule_name').on(table.guildId, table.ruleName),
    };
  }
);

export const battleRecords = sqliteTable(
  'battle_records',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
    importedByUserId: text('imported_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    externalRecordId: text('external_record_id').notNull(),
    externalBattleId: text('external_battle_id'),
    battleName: text('battle_name'),
    source: text('source', { enum: ['albion_killboard', 'manual', 'custom'] }).notNull().default('custom'),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    isDeath: integer('is_death', { mode: 'boolean' }).notNull().default(true),
    reimbursementSessionId: text('reimbursement_session_id').references(() => reimbursementSessions.id, { onDelete: 'set null' }),
    guildMemberId: text('guild_member_id').references(() => guildMembers.id, { onDelete: 'set null' }),
    gameCharacterId: text('game_character_id').references(() => gameCharacters.id, { onDelete: 'set null' }),
    victimGameAccountId: text('victim_game_account_id'),
    victimCharacterName: text('victim_character_name').notNull(),
    totalEstimatedValue: integer('total_estimated_value').notNull().default(0),
    equipmentItemsJson: text('equipment_items_json').notNull(),
    tagsJson: text('tags_json'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqGuildExternalBattleRecord: uniqueIndex('unq_guild_external_battle_record').on(table.guildId, table.externalRecordId),
    };
  }
);

export const reimbursementRecords = sqliteTable(
  'reimbursement_records',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull().references(() => reimbursementSessions.id, { onDelete: 'cascade' }),
    battleRecordId: text('battle_record_id').notNull().references(() => battleRecords.id, { onDelete: 'cascade' }),
    guildMemberId: text('guild_member_id').references(() => guildMembers.id, { onDelete: 'set null' }),
    gameCharacterId: text('game_character_id').references(() => gameCharacters.id, { onDelete: 'set null' }),
    applicantUserId: text('applicant_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: text('status', {
      enum: ['pending_submission', 'pending_review', 'approved', 'rejected', 'completed'],
    })
      .notNull()
      .default('pending_submission'),
    autoDecision: text('auto_decision', { enum: ['none', 'approved', 'rejected'] }).notNull().default('none'),
    reimbursementAmount: integer('reimbursement_amount'),
    latestNote: text('latest_note'),
    lastReviewedBy: text('last_reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    lastReviewedAt: integer('last_reviewed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => {
    return {
      unqReimbursementBattleRecord: uniqueIndex('unq_reimbursement_battle_record').on(table.battleRecordId),
    };
  }
);

export const reimbursementApprovalLogs = sqliteTable('reimbursement_approval_logs', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull().references(() => guilds.id, { onDelete: 'cascade' }),
  reimbursementRecordId: text('reimbursement_record_id')
    .notNull()
    .references(() => reimbursementRecords.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status', {
    enum: ['pending_submission', 'pending_review', 'approved', 'rejected', 'completed'],
  }),
  toStatus: text('to_status', {
    enum: ['pending_submission', 'pending_review', 'approved', 'rejected', 'completed'],
  }).notNull(),
  actionType: text('action_type', { enum: ['session_created', 'manual_review', 'auto_rule'] }).notNull(),
  operatedByUserId: text('operated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  autoApprovalRuleId: text('auto_approval_rule_id').references(() => reimbursementAutoApprovalRules.id, { onDelete: 'set null' }),
  note: text('note'),
  metadataJson: text('metadata_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
