import {
  battleRecords,
  reimbursementAutoApprovalRules,
  reimbursementRecords,
} from '@albionbox/db/src/schema/battle_reimbursements';
import { normalizeOptionalText, parseJsonValue } from '../shared/utils';
import { type AutoApprovalConditions, type EquipmentItem } from './types';

export const getPLevel = (item: EquipmentItem) => item.tier + item.enchantmentLevel;

export const getSessionProgress = (records: Array<typeof reimbursementRecords.$inferSelect>) => {
  const total = records.length;
  const counts = {
    pendingSubmission: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
  };

  for (const record of records) {
    if (record.status === 'pending_submission') {
      counts.pendingSubmission += 1;
    } else if (record.status === 'pending_review') {
      counts.pendingReview += 1;
    } else if (record.status === 'approved') {
      counts.approved += 1;
    } else if (record.status === 'rejected') {
      counts.rejected += 1;
    } else if (record.status === 'completed') {
      counts.completed += 1;
    }
  }

  const processed = counts.approved + counts.rejected + counts.completed;

  return {
    total,
    ...counts,
    processed,
    progressPercent: total === 0 ? 0 : Math.round((processed / total) * 100),
  };
};

export const getBattleRecordPayload = (battleRecord: typeof battleRecords.$inferSelect) => ({
  ...battleRecord,
  equipmentItems: parseJsonValue<EquipmentItem[]>(battleRecord.equipmentItemsJson, []),
  tags: parseJsonValue<string[]>(battleRecord.tagsJson, []),
});

export const getRulePayload = (rule: typeof reimbursementAutoApprovalRules.$inferSelect) => ({
  ...rule,
  conditions: parseJsonValue<AutoApprovalConditions>(rule.conditionsJson, {}),
});

export const evaluateAutoApprovalRule = (
  battleRecord: typeof battleRecords.$inferSelect,
  equipmentItems: EquipmentItem[],
  rule: typeof reimbursementAutoApprovalRules.$inferSelect
) => {
  const conditions = parseJsonValue<AutoApprovalConditions>(rule.conditionsJson, {});
  const checks: boolean[] = [];

  if (conditions.minEstimatedValue !== undefined) {
    checks.push(battleRecord.totalEstimatedValue >= conditions.minEstimatedValue);
  }

  if (conditions.maxEstimatedValue !== undefined) {
    checks.push(battleRecord.totalEstimatedValue <= conditions.maxEstimatedValue);
  }

  if (conditions.memberIds && conditions.memberIds.length > 0) {
    checks.push(Boolean(battleRecord.guildMemberId && conditions.memberIds.includes(battleRecord.guildMemberId)));
  }

  if (conditions.gameCharacterIds && conditions.gameCharacterIds.length > 0) {
    checks.push(Boolean(battleRecord.gameCharacterId && conditions.gameCharacterIds.includes(battleRecord.gameCharacterId)));
  }

  if (conditions.equipmentKeys && conditions.equipmentKeys.length > 0) {
    checks.push(equipmentItems.some((item) => conditions.equipmentKeys?.includes(item.itemKey)));
  }

  if (conditions.pLevels && conditions.pLevels.length > 0) {
    checks.push(equipmentItems.some((item) => conditions.pLevels?.includes(getPLevel(item))));
  }

  if (checks.length === 0) {
    return null;
  }

  const matched = rule.matchMode === 'all' ? checks.every(Boolean) : checks.some(Boolean);

  if (!matched) {
    return null;
  }

  return {
    rule,
    status: rule.action === 'approve' ? 'approved' : 'rejected',
    autoDecision: rule.action === 'approve' ? 'approved' : 'rejected',
    note: normalizeOptionalText(rule.noteTemplate) ?? `命中自动审批规则：${rule.ruleName}`,
  } as const;
};
