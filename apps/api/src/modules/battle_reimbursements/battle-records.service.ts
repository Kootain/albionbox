import { and, desc, eq, inArray } from 'drizzle-orm';
import { battleRecords, reimbursementRecords, reimbursementSessions } from '@albionbox/db/src/schema/battle_reimbursements';
import { guildMembers } from '@albionbox/db/src/schema/guilds';
import { gameCharacters } from '@albionbox/db/src/schema/users';
import { type GuildAccessContext } from '../shared/guild-access';
import { AppError } from '../shared/errors';
import { createEntityId, normalizeOptionalText } from '../shared/utils';
import { getBattleRecordPayload, getSessionProgress } from './helpers';
import { type DbClient, type EquipmentItem } from './types';

export const listBattleRecords = async (
  db: DbClient,
  guildId: string,
  query: {
    sessionId?: string;
    linkStatus?: 'linked' | 'unlinked' | 'all';
  }
) => {
  const allRows = await db.select().from(battleRecords).where(eq(battleRecords.guildId, guildId)).orderBy(desc(battleRecords.occurredAt)).all();
  const filteredRows = allRows.filter((row) => {
    if (query.sessionId && row.reimbursementSessionId !== query.sessionId) {
      return false;
    }

    if (query.linkStatus === 'linked' && !row.reimbursementSessionId) {
      return false;
    }

    if (query.linkStatus === 'unlinked' && row.reimbursementSessionId) {
      return false;
    }

    return true;
  });
  const sessionIds = Array.from(
    new Set(filteredRows.map((row) => row.reimbursementSessionId).filter((value): value is string => Boolean(value)))
  );

  const [sessions, recordsForSessions] = await Promise.all([
    sessionIds.length > 0 ? db.select().from(reimbursementSessions).where(inArray(reimbursementSessions.id, sessionIds)).all() : [],
    sessionIds.length > 0 ? db.select().from(reimbursementRecords).where(inArray(reimbursementRecords.sessionId, sessionIds)).all() : [],
  ]);

  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const progressMap = new Map<string, ReturnType<typeof getSessionProgress>>();

  for (const session of sessions) {
    progressMap.set(
      session.id,
      getSessionProgress(recordsForSessions.filter((record) => record.sessionId === session.id))
    );
  }

  return {
    battleRecords: filteredRows.map((row) => ({
      ...getBattleRecordPayload(row),
      linkedSession: row.reimbursementSessionId
        ? {
            session: sessionMap.get(row.reimbursementSessionId) ?? null,
            progress: progressMap.get(row.reimbursementSessionId) ?? null,
          }
        : null,
    })),
  };
};

export const importBattleRecordRows = async (
  db: DbClient,
  guildId: string,
  userId: string,
  guildAccess: GuildAccessContext,
  payload: {
    records: Array<{
      externalRecordId: string;
      externalBattleId?: string;
      battleName?: string;
      source: 'albion_killboard' | 'manual' | 'custom';
      occurredAt: string;
      isDeath: boolean;
      gameCharacterId?: string;
      victimGameAccountId?: string;
      victimCharacterName: string;
      totalEstimatedValue?: number;
      equipmentItems: EquipmentItem[];
      tags?: string[];
    }>;
  }
) => {
  const gameCharacterIds = Array.from(
    new Set(payload.records.map((record) => record.gameCharacterId).filter((gameCharacterId): gameCharacterId is string => Boolean(gameCharacterId)))
  );

  const [gameCharacterRows, existingRecords] = await Promise.all([
    gameCharacterIds.length > 0 ? db.select().from(gameCharacters).where(inArray(gameCharacters.id, gameCharacterIds)).all() : [],
    db
      .select()
      .from(battleRecords)
      .where(and(eq(battleRecords.guildId, guildId), inArray(battleRecords.externalRecordId, payload.records.map((record) => record.externalRecordId))))
      .all(),
  ]);

  if (gameCharacterRows.length !== gameCharacterIds.length) {
    const missingIds = gameCharacterIds.filter((gameCharacterId) => !gameCharacterRows.some((row) => row.id === gameCharacterId));
    throw new AppError(400, `存在无效的游戏角色：${missingIds.join(', ')}`);
  }

  const invalidServerCharacter = gameCharacterRows.find((row) => row.server !== guildAccess.guild.server);

  if (invalidServerCharacter) {
    throw new AppError(400, '导入的游戏角色服务器必须与工会服务器一致');
  }

  const guildMemberRows =
    gameCharacterIds.length > 0
      ? await db
          .select()
          .from(guildMembers)
          .where(and(eq(guildMembers.guildId, guildId), inArray(guildMembers.gameCharacterId, gameCharacterIds)))
          .all()
      : [];

  const gameCharacterMap = new Map(gameCharacterRows.map((row) => [row.id, row]));
  const guildMemberMap = new Map(
    guildMemberRows
      .filter((row): row is typeof row & { gameCharacterId: string } => Boolean(row.gameCharacterId))
      .map((row) => [row.gameCharacterId, row])
  );
  const existingRecordMap = new Map(existingRecords.map((record) => [record.externalRecordId, record]));
  const now = new Date();
  const affectedIds: string[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const record of payload.records) {
    const gameCharacter = record.gameCharacterId ? gameCharacterMap.get(record.gameCharacterId) ?? null : null;
    const guildMember = record.gameCharacterId ? guildMemberMap.get(record.gameCharacterId) ?? null : null;
    const existingRecord = existingRecordMap.get(record.externalRecordId) ?? null;
    const values = {
      guildId,
      importedByUserId: userId,
      externalRecordId: record.externalRecordId,
      externalBattleId: normalizeOptionalText(record.externalBattleId),
      battleName: normalizeOptionalText(record.battleName),
      source: record.source,
      occurredAt: new Date(record.occurredAt),
      isDeath: record.isDeath,
      guildMemberId: guildMember?.id ?? null,
      gameCharacterId: gameCharacter?.id ?? null,
      victimGameAccountId: normalizeOptionalText(record.victimGameAccountId),
      victimCharacterName: gameCharacter?.characterName ?? record.victimCharacterName.trim(),
      totalEstimatedValue: record.totalEstimatedValue ?? 0,
      equipmentItemsJson: JSON.stringify(
        record.equipmentItems.map((item) => ({
          ...item,
          slot: normalizeOptionalText(item.slot) ?? undefined,
          quantity: item.quantity ?? 1,
        }))
      ),
      tagsJson: record.tags ? JSON.stringify(record.tags.map((tag) => tag.trim())) : null,
      updatedAt: now,
    } as const;

    if (existingRecord) {
      await db.update(battleRecords).set(values).where(eq(battleRecords.id, existingRecord.id));
      affectedIds.push(existingRecord.id);
      updatedCount += 1;
    } else {
      const battleRecordId = createEntityId('battle_record');
      await db.insert(battleRecords).values({
        id: battleRecordId,
        ...values,
      });
      affectedIds.push(battleRecordId);
      createdCount += 1;
    }
  }

  const importedBattleRecords =
    affectedIds.length > 0 ? await db.select().from(battleRecords).where(inArray(battleRecords.id, affectedIds)).all() : [];

  return {
    message: '战斗记录导入完成',
    summary: {
      createdCount,
      updatedCount,
    },
    battleRecords: importedBattleRecords.map((record) => getBattleRecordPayload(record)),
  };
};
