import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import {
  CreateAutoApprovalRuleSchema,
  CreateReimbursementSessionSchema,
  ImportBattleRecordsSchema,
  QueryBattleRecordsSchema,
  QueryEquipmentSummarySchema,
  QueryReimbursementSessionsSchema,
  UpdateAutoApprovalRuleSchema,
  UpdateReimbursementRecordStatusSchema,
  UpdateReimbursementSessionSchema,
} from '@albionbox/shared';
import { requireAuth } from '../shared/auth';
import { toErrorResponse } from '../shared/errors';
import { type GuildAccessContext, requireAnyGuildPermission, requireGuildPermission } from '../shared/guild-access';
import {
  createAutoApprovalRule,
  createReimbursementSession,
  getEquipmentSummary,
  getReimbursementSession,
  importBattleRecordRows,
  listAutoApprovalRules,
  listBattleRecords,
  listReimbursementSessions,
  updateAutoApprovalRule,
  updateReimbursementRecordStatus,
  updateReimbursementSession,
} from './service';

const battleReimbursementsApp = new Hono<{
  Bindings: Env;
  Variables: {
    userId: string;
    sessionToken: string;
    guildAccess: GuildAccessContext;
  };
}>();

battleReimbursementsApp.get(
  '/:guild_id/battle_records',
  requireAuth,
  requireGuildPermission(['guild:view']),
  zValidator('query', QueryBattleRecordsSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await listBattleRecords(db, c.req.param('guild_id'), c.req.valid('query')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.post(
  '/:guild_id/battle_records/import',
  requireAuth,
  requireGuildPermission(['battle:manage_records']),
  zValidator('json', ImportBattleRecordsSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await importBattleRecordRows(db, c.req.param('guild_id'), c.get('userId'), c.get('guildAccess'), c.req.valid('json'))
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.get(
  '/:guild_id/reimbursement_sessions',
  requireAuth,
  requireAnyGuildPermission(['reimbursement:manage_sessions', 'reimbursement:view_summary']),
  zValidator('query', QueryReimbursementSessionsSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await listReimbursementSessions(db, c.req.param('guild_id'), c.req.valid('query')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.post(
  '/:guild_id/reimbursement_sessions',
  requireAuth,
  requireGuildPermission(['reimbursement:manage_sessions']),
  zValidator('json', CreateReimbursementSessionSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await createReimbursementSession(db, c.req.param('guild_id'), c.get('userId'), c.req.valid('json')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.get(
  '/:guild_id/reimbursement_sessions/:session_id',
  requireAuth,
  requireAnyGuildPermission(['reimbursement:manage_sessions', 'reimbursement:view_summary']),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await getReimbursementSession(db, c.req.param('guild_id'), c.req.param('session_id')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.patch(
  '/:guild_id/reimbursement_sessions/:session_id',
  requireAuth,
  requireGuildPermission(['reimbursement:manage_sessions']),
  zValidator('json', UpdateReimbursementSessionSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await updateReimbursementSession(
          db,
          c.req.param('guild_id'),
          c.req.param('session_id'),
          c.get('userId'),
          c.req.valid('json')
        )
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.patch(
  '/:guild_id/reimbursement_records/:record_id/status',
  requireAuth,
  requireGuildPermission(['reimbursement:manage_sessions']),
  zValidator('json', UpdateReimbursementRecordStatusSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await updateReimbursementRecordStatus(
          db,
          c.req.param('guild_id'),
          c.req.param('record_id'),
          c.get('userId'),
          c.req.valid('json')
        )
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.get('/:guild_id/auto_approval_rules', requireAuth, requireGuildPermission(['reimbursement:manage_sessions']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listAutoApprovalRules(db, c.req.param('guild_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

battleReimbursementsApp.post(
  '/:guild_id/auto_approval_rules',
  requireAuth,
  requireGuildPermission(['reimbursement:manage_sessions']),
  zValidator('json', CreateAutoApprovalRuleSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await createAutoApprovalRule(db, c.req.param('guild_id'), c.get('userId'), c.req.valid('json')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.patch(
  '/:guild_id/auto_approval_rules/:rule_id',
  requireAuth,
  requireGuildPermission(['reimbursement:manage_sessions']),
  zValidator('json', UpdateAutoApprovalRuleSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await updateAutoApprovalRule(
          db,
          c.req.param('guild_id'),
          c.req.param('rule_id'),
          c.get('userId'),
          c.req.valid('json')
        )
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

battleReimbursementsApp.get(
  '/:guild_id/equipment_summary',
  requireAuth,
  requireAnyGuildPermission(['reimbursement:manage_sessions', 'reimbursement:view_summary']),
  zValidator('query', QueryEquipmentSummarySchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await getEquipmentSummary(db, c.req.param('guild_id'), c.req.valid('query')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

export default battleReimbursementsApp;
