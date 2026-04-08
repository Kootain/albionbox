import { and, desc, eq } from 'drizzle-orm';
import {
  reimbursementApprovalLogs,
  reimbursementRecords,
} from '@albionbox/db/src/schema/battle_reimbursements';
import { guildMemberBoxes } from '@albionbox/db/src/schema/guilds';
import { AppError } from '../shared/errors';
import { createEntityId, normalizeOptionalText } from '../shared/utils';
import { buildSessionDetail } from './detail';
import { getPLevel } from './helpers';
import { type DbClient } from './types';

export const updateReimbursementRecordStatus = async (
  db: DbClient,
  guildId: string,
  reimbursementRecordId: string,
  userId: string,
  payload: {
    status: 'pending_submission' | 'pending_review' | 'approved' | 'rejected' | 'completed';
    reimbursementAmount?: number;
    note?: string;
  }
) => {
  const reimbursementRecord = await db
    .select()
    .from(reimbursementRecords)
    .where(and(eq(reimbursementRecords.id, reimbursementRecordId), eq(reimbursementRecords.guildId, guildId)))
    .get();

  if (!reimbursementRecord) {
    throw new AppError(404, '补装记录不存在');
  }

  const normalizedNote = normalizeOptionalText(payload.note);
  const now = new Date();

  await db
    .update(reimbursementRecords)
    .set({
      status: payload.status,
      reimbursementAmount: payload.reimbursementAmount ?? reimbursementRecord.reimbursementAmount,
      latestNote: normalizedNote,
      lastReviewedBy: userId,
      lastReviewedAt: now,
      updatedAt: now,
    })
    .where(eq(reimbursementRecords.id, reimbursementRecordId));

  await db.insert(reimbursementApprovalLogs).values({
    id: createEntityId('reimbursement_log'),
    guildId,
    reimbursementRecordId,
    fromStatus: reimbursementRecord.status,
    toStatus: payload.status,
    actionType: 'manual_review',
    operatedByUserId: userId,
    autoApprovalRuleId: null,
    note: normalizedNote,
    metadataJson: JSON.stringify({
      reimbursementAmount: payload.reimbursementAmount ?? reimbursementRecord.reimbursementAmount,
    }),
  });

  return {
    message: '补装记录状态已更新',
    reimbursementRecord: await db.select().from(reimbursementRecords).where(eq(reimbursementRecords.id, reimbursementRecordId)).get(),
    logs: await db
      .select()
      .from(reimbursementApprovalLogs)
      .where(eq(reimbursementApprovalLogs.reimbursementRecordId, reimbursementRecordId))
      .orderBy(desc(reimbursementApprovalLogs.createdAt))
      .all(),
  };
};

export const getEquipmentSummary = async (
  db: DbClient,
  guildId: string,
  query: {
    sessionId: string;
    includeRejected?: boolean;
  }
) => {
  const detail = await buildSessionDetail(db, query.sessionId, guildId);

  if (!detail) {
    throw new AppError(404, '补装 session 不存在');
  }

  const summaryMap = new Map<
    string,
    {
      itemKey: string;
      itemName: string;
      pLevel: number;
      totalQuantity: number;
      memberCount: number;
      memberIds: Set<string>;
    }
  >();
  const memberMap = new Map<
    string,
    {
      memberId: string | null;
      victimCharacterName: string;
      gameCharacterId: string | null;
      boxCoordinate: typeof guildMemberBoxes.$inferSelect | null;
      items: Array<{
        itemKey: string;
        itemName: string;
        pLevel: number;
        quantity: number;
      }>;
    }
  >();

  for (const record of detail.reimbursementRecords) {
    if (!record.battleRecord) {
      continue;
    }

    if (!query.includeRejected && record.status === 'rejected') {
      continue;
    }

    const equipmentItems = record.battleRecord.equipmentItems;
    const memberKey = record.guildMember?.id ?? record.battleRecord.id;
    const currentMember = memberMap.get(memberKey) ?? {
      memberId: record.guildMember?.id ?? null,
      victimCharacterName: record.gameCharacter?.characterName ?? record.battleRecord.victimCharacterName,
      gameCharacterId: record.gameCharacter?.id ?? null,
      boxCoordinate: record.boxCoordinate,
      items: [],
    };

    for (const item of equipmentItems) {
      const pLevel = getPLevel(item);
      const summaryKey = `${item.itemKey}:${pLevel}`;
      const previousSummary = summaryMap.get(summaryKey) ?? {
        itemKey: item.itemKey,
        itemName: item.itemName,
        pLevel,
        totalQuantity: 0,
        memberCount: 0,
        memberIds: new Set<string>(),
      };
      previousSummary.totalQuantity += item.quantity;

      if (record.guildMember?.id) {
        previousSummary.memberIds.add(record.guildMember.id);
        previousSummary.memberCount = previousSummary.memberIds.size;
      }

      summaryMap.set(summaryKey, previousSummary);
      currentMember.items.push({
        itemKey: item.itemKey,
        itemName: item.itemName,
        pLevel,
        quantity: item.quantity,
      });
    }

    memberMap.set(memberKey, currentMember);
  }

  return {
    session: detail.session,
    progress: detail.progress,
    overall: Array.from(summaryMap.values()).map((item) => ({
      itemKey: item.itemKey,
      itemName: item.itemName,
      pLevel: item.pLevel,
      pLevelLabel: `P${item.pLevel}`,
      totalQuantity: item.totalQuantity,
      memberCount: item.memberCount,
    })),
    byMember: Array.from(memberMap.values()).map((member) => ({
      ...member,
      items: member.items,
    })),
  };
};
