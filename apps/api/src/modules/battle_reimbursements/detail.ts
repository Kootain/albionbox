import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  battleRecords,
  reimbursementApprovalLogs,
  reimbursementAutoApprovalRules,
  reimbursementRecords,
  reimbursementSessions,
} from '@albionbox/db/src/schema/battle_reimbursements';
import { guildMemberBoxes, guildMembers } from '@albionbox/db/src/schema/guilds';
import { gameCharacters } from '@albionbox/db/src/schema/users';
import { createEntityId, parseJsonValue } from '../shared/utils';
import { evaluateAutoApprovalRule, getBattleRecordPayload, getSessionProgress } from './helpers';
import { type DbClient, type EquipmentItem } from './types';

export const createReimbursementRecordForBattleRecord = async (
  db: DbClient,
  session: typeof reimbursementSessions.$inferSelect,
  battleRecord: typeof battleRecords.$inferSelect,
  rules: Array<typeof reimbursementAutoApprovalRules.$inferSelect>
) => {
  const reimbursementRecordId = createEntityId('reimbursement_record');
  const now = new Date();
  const equipmentItems = parseJsonValue<EquipmentItem[]>(battleRecord.equipmentItemsJson, []);
  const applicantGameCharacter =
    battleRecord.gameCharacterId
      ? await db.select().from(gameCharacters).where(eq(gameCharacters.id, battleRecord.gameCharacterId)).get()
      : null;

  await db.insert(reimbursementRecords).values({
    id: reimbursementRecordId,
    guildId: session.guildId,
    sessionId: session.id,
    battleRecordId: battleRecord.id,
    guildMemberId: battleRecord.guildMemberId,
    gameCharacterId: battleRecord.gameCharacterId,
    applicantUserId: applicantGameCharacter?.userId ?? null,
    status: 'pending_submission',
    autoDecision: 'none',
    reimbursementAmount: null,
    latestNote: null,
    lastReviewedBy: null,
    lastReviewedAt: null,
    updatedAt: now,
  });

  await db.insert(reimbursementApprovalLogs).values({
    id: createEntityId('reimbursement_log'),
    guildId: session.guildId,
    reimbursementRecordId,
    fromStatus: null,
    toStatus: 'pending_submission',
    actionType: 'session_created',
    operatedByUserId: session.createdByUserId,
    autoApprovalRuleId: null,
    note: '由补装 session 自动生成',
    metadataJson: JSON.stringify({ sessionId: session.id, battleRecordId: battleRecord.id }),
  });

  for (const rule of rules) {
    const autoDecision = evaluateAutoApprovalRule(battleRecord, equipmentItems, rule);

    if (!autoDecision) {
      continue;
    }

    await db
      .update(reimbursementRecords)
      .set({
        status: autoDecision.status,
        autoDecision: autoDecision.autoDecision,
        latestNote: autoDecision.note,
        lastReviewedAt: now,
        updatedAt: now,
      })
      .where(eq(reimbursementRecords.id, reimbursementRecordId));

    await db.insert(reimbursementApprovalLogs).values({
      id: createEntityId('reimbursement_log'),
      guildId: session.guildId,
      reimbursementRecordId,
      fromStatus: 'pending_submission',
      toStatus: autoDecision.status,
      actionType: 'auto_rule',
      operatedByUserId: null,
      autoApprovalRuleId: rule.id,
      note: autoDecision.note,
      metadataJson: JSON.stringify({
        ruleName: rule.ruleName,
        action: rule.action,
      }),
    });

    break;
  }
};

export const buildSessionDetail = async (db: DbClient, sessionId: string, guildId: string) => {
  const session = await db
    .select()
    .from(reimbursementSessions)
    .where(and(eq(reimbursementSessions.id, sessionId), eq(reimbursementSessions.guildId, guildId)))
    .get();

  if (!session) {
    return null;
  }

  const [linkedBattleRecords, sessionReimbursementRecords] = await Promise.all([
    db.select().from(battleRecords).where(eq(battleRecords.reimbursementSessionId, session.id)).orderBy(desc(battleRecords.occurredAt)).all(),
    db.select().from(reimbursementRecords).where(eq(reimbursementRecords.sessionId, session.id)).orderBy(desc(reimbursementRecords.createdAt)).all(),
  ]);

  const reimbursementRecordIds = sessionReimbursementRecords.map((record) => record.id);
  const guildMemberIds = Array.from(
    new Set(sessionReimbursementRecords.map((record) => record.guildMemberId).filter((memberId): memberId is string => Boolean(memberId)))
  );
  const gameCharacterIds = Array.from(
    new Set(sessionReimbursementRecords.map((record) => record.gameCharacterId).filter((characterId): characterId is string => Boolean(characterId)))
  );

  const [logs, members, boxes, characters] = await Promise.all([
    reimbursementRecordIds.length > 0
      ? db
          .select()
          .from(reimbursementApprovalLogs)
          .where(inArray(reimbursementApprovalLogs.reimbursementRecordId, reimbursementRecordIds))
          .orderBy(desc(reimbursementApprovalLogs.createdAt))
          .all()
      : [],
    guildMemberIds.length > 0 ? db.select().from(guildMembers).where(inArray(guildMembers.id, guildMemberIds)).all() : [],
    guildMemberIds.length > 0 ? db.select().from(guildMemberBoxes).where(inArray(guildMemberBoxes.guildMemberId, guildMemberIds)).all() : [],
    gameCharacterIds.length > 0 ? db.select().from(gameCharacters).where(inArray(gameCharacters.id, gameCharacterIds)).all() : [],
  ]);

  const battleRecordMap = new Map(linkedBattleRecords.map((record) => [record.id, record]));
  const logsByRecordId = new Map<string, typeof logs>();

  for (const log of logs) {
    const previous = logsByRecordId.get(log.reimbursementRecordId) ?? [];
    previous.push(log);
    logsByRecordId.set(log.reimbursementRecordId, previous);
  }

  const memberMap = new Map(members.map((member) => [member.id, member]));
  const boxMap = new Map(boxes.map((box) => [box.guildMemberId, box]));
  const characterMap = new Map(characters.map((character) => [character.id, character]));

  return {
    session,
    progress: getSessionProgress(sessionReimbursementRecords),
    battleRecords: linkedBattleRecords.map((record) => getBattleRecordPayload(record)),
    reimbursementRecords: sessionReimbursementRecords.map((record) => ({
      ...record,
      battleRecord: battleRecordMap.get(record.battleRecordId) ? getBattleRecordPayload(battleRecordMap.get(record.battleRecordId)!) : null,
      guildMember: record.guildMemberId ? memberMap.get(record.guildMemberId) ?? null : null,
      boxCoordinate: record.guildMemberId ? boxMap.get(record.guildMemberId) ?? null : null,
      gameCharacter: record.gameCharacterId ? characterMap.get(record.gameCharacterId) ?? null : null,
      logs: logsByRecordId.get(record.id) ?? [],
    })),
  };
};
