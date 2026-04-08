import { and, asc, eq } from 'drizzle-orm';
import { reimbursementAutoApprovalRules } from '@albionbox/db/src/schema/battle_reimbursements';
import { AppError } from '../shared/errors';
import { createEntityId, normalizeOptionalText } from '../shared/utils';
import { getRulePayload } from './helpers';
import { type AutoApprovalConditions, type DbClient } from './types';

export const listAutoApprovalRules = async (db: DbClient, guildId: string) => {
  const rules = await db
    .select()
    .from(reimbursementAutoApprovalRules)
    .where(eq(reimbursementAutoApprovalRules.guildId, guildId))
    .orderBy(asc(reimbursementAutoApprovalRules.priority), asc(reimbursementAutoApprovalRules.createdAt))
    .all();

  return {
    autoApprovalRules: rules.map((rule) => getRulePayload(rule)),
  };
};

export const createAutoApprovalRule = async (
  db: DbClient,
  guildId: string,
  userId: string,
  payload: {
    ruleName: string;
    description?: string;
    enabled: boolean;
    priority: number;
    matchMode: 'all' | 'any';
    action: 'approve' | 'reject';
    noteTemplate?: string;
    conditions: AutoApprovalConditions;
  }
) => {
  const normalizedRuleName = payload.ruleName.trim();
  const existingRule = await db
    .select()
    .from(reimbursementAutoApprovalRules)
    .where(and(eq(reimbursementAutoApprovalRules.guildId, guildId), eq(reimbursementAutoApprovalRules.ruleName, normalizedRuleName)))
    .get();

  if (existingRule) {
    throw new AppError(409, '规则名称已存在');
  }

  const ruleId = createEntityId('reimbursement_rule');
  const now = new Date();

  await db.insert(reimbursementAutoApprovalRules).values({
    id: ruleId,
    guildId,
    ruleName: normalizedRuleName,
    description: normalizeOptionalText(payload.description),
    enabled: payload.enabled,
    priority: payload.priority,
    matchMode: payload.matchMode,
    action: payload.action,
    noteTemplate: normalizeOptionalText(payload.noteTemplate),
    conditionsJson: JSON.stringify(payload.conditions),
    createdByUserId: userId,
    updatedByUserId: userId,
    updatedAt: now,
  });

  const rule = await db.select().from(reimbursementAutoApprovalRules).where(eq(reimbursementAutoApprovalRules.id, ruleId)).get();

  return {
    message: '自动审批规则已创建',
    autoApprovalRule: rule ? getRulePayload(rule) : null,
  };
};

export const updateAutoApprovalRule = async (
  db: DbClient,
  guildId: string,
  ruleId: string,
  userId: string,
  payload: {
    ruleName?: string;
    description?: string;
    enabled?: boolean;
    priority?: number;
    matchMode?: 'all' | 'any';
    action?: 'approve' | 'reject';
    noteTemplate?: string;
    conditions?: AutoApprovalConditions;
  }
) => {
  const existingRule = await db
    .select()
    .from(reimbursementAutoApprovalRules)
    .where(and(eq(reimbursementAutoApprovalRules.id, ruleId), eq(reimbursementAutoApprovalRules.guildId, guildId)))
    .get();

  if (!existingRule) {
    throw new AppError(404, '自动审批规则不存在');
  }

  const normalizedRuleName = payload.ruleName?.trim();

  if (normalizedRuleName && normalizedRuleName !== existingRule.ruleName) {
    const duplicatedRule = await db
      .select()
      .from(reimbursementAutoApprovalRules)
      .where(and(eq(reimbursementAutoApprovalRules.guildId, guildId), eq(reimbursementAutoApprovalRules.ruleName, normalizedRuleName)))
      .get();

    if (duplicatedRule) {
      throw new AppError(409, '规则名称已存在');
    }
  }

  await db
    .update(reimbursementAutoApprovalRules)
    .set({
      ruleName: normalizedRuleName ?? existingRule.ruleName,
      description: payload.description !== undefined ? normalizeOptionalText(payload.description) : existingRule.description,
      enabled: payload.enabled ?? existingRule.enabled,
      priority: payload.priority ?? existingRule.priority,
      matchMode: payload.matchMode ?? existingRule.matchMode,
      action: payload.action ?? existingRule.action,
      noteTemplate: payload.noteTemplate !== undefined ? normalizeOptionalText(payload.noteTemplate) : existingRule.noteTemplate,
      conditionsJson: payload.conditions ? JSON.stringify(payload.conditions) : existingRule.conditionsJson,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(eq(reimbursementAutoApprovalRules.id, ruleId));

  const updatedRule = await db.select().from(reimbursementAutoApprovalRules).where(eq(reimbursementAutoApprovalRules.id, ruleId)).get();

  return {
    message: '自动审批规则已更新',
    autoApprovalRule: updatedRule ? getRulePayload(updatedRule) : null,
  };
};
