import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  battleRecords,
  reimbursementAutoApprovalRules,
  reimbursementRecords,
  reimbursementSessions,
} from '@albionbox/db/src/schema/battle_reimbursements';
import { AppError } from '../shared/errors';
import { createEntityId, normalizeOptionalText } from '../shared/utils';
import { buildSessionDetail, createReimbursementRecordForBattleRecord } from './detail';
import { getSessionProgress } from './helpers';
import { type DbClient } from './types';

export const listReimbursementSessions = async (
  db: DbClient,
  guildId: string,
  query: {
    status?: 'open' | 'completed' | 'closed';
  }
) => {
  const sessions = query.status
    ? await db
        .select()
        .from(reimbursementSessions)
        .where(and(eq(reimbursementSessions.guildId, guildId), eq(reimbursementSessions.status, query.status)))
        .orderBy(desc(reimbursementSessions.createdAt))
        .all()
    : await db
        .select()
        .from(reimbursementSessions)
        .where(eq(reimbursementSessions.guildId, guildId))
        .orderBy(desc(reimbursementSessions.createdAt))
        .all();

  const sessionIds = sessions.map((session) => session.id);
  const sessionRecords =
    sessionIds.length > 0 ? await db.select().from(reimbursementRecords).where(inArray(reimbursementRecords.sessionId, sessionIds)).all() : [];

  return {
    reimbursementSessions: sessions.map((session) => ({
      ...session,
      progress: getSessionProgress(sessionRecords.filter((record) => record.sessionId === session.id)),
    })),
  };
};

export const createReimbursementSession = async (
  db: DbClient,
  guildId: string,
  userId: string,
  payload: {
    title: string;
    description?: string;
    battleRecordIds: string[];
  }
) => {
  const [selectedBattleRecords, activeRules] = await Promise.all([
    db
      .select()
      .from(battleRecords)
      .where(and(eq(battleRecords.guildId, guildId), inArray(battleRecords.id, payload.battleRecordIds)))
      .all(),
    db
      .select()
      .from(reimbursementAutoApprovalRules)
      .where(and(eq(reimbursementAutoApprovalRules.guildId, guildId), eq(reimbursementAutoApprovalRules.enabled, true)))
      .orderBy(asc(reimbursementAutoApprovalRules.priority), asc(reimbursementAutoApprovalRules.createdAt))
      .all(),
  ]);

  if (selectedBattleRecords.length !== payload.battleRecordIds.length) {
    throw new AppError(400, '存在无效的战斗记录');
  }

  const invalidBattleRecord = selectedBattleRecords.find(
    (record) => !record.isDeath || (record.reimbursementSessionId && record.reimbursementSessionId.length > 0)
  );

  if (invalidBattleRecord) {
    throw new AppError(409, '仅未关联 session 的死亡记录可用于创建补装 session');
  }

  const now = new Date();
  const sessionId = createEntityId('reimbursement_session');

  await db.insert(reimbursementSessions).values({
    id: sessionId,
    guildId,
    title: payload.title.trim(),
    description: normalizeOptionalText(payload.description),
    status: 'open',
    createdByUserId: userId,
    closedByUserId: null,
    closedAt: null,
    updatedAt: now,
  });

  for (const battleRecord of selectedBattleRecords) {
    await db
      .update(battleRecords)
      .set({
        reimbursementSessionId: sessionId,
        updatedAt: now,
      })
      .where(eq(battleRecords.id, battleRecord.id));
  }

  const createdSession =
    (await db.select().from(reimbursementSessions).where(eq(reimbursementSessions.id, sessionId)).get()) ?? null;

  if (!createdSession) {
    throw new AppError(500, '补装 session 创建失败');
  }

  for (const battleRecord of selectedBattleRecords) {
    await createReimbursementRecordForBattleRecord(db, createdSession, battleRecord, activeRules);
  }

  return {
    message: '补装 session 已创建',
    reimbursementSession: await buildSessionDetail(db, sessionId, guildId),
  };
};

export const getReimbursementSession = async (db: DbClient, guildId: string, sessionId: string) => {
  const detail = await buildSessionDetail(db, sessionId, guildId);

  if (!detail) {
    throw new AppError(404, '补装 session 不存在');
  }

  return { reimbursementSession: detail };
};

export const updateReimbursementSession = async (
  db: DbClient,
  guildId: string,
  sessionId: string,
  userId: string,
  payload: {
    title?: string;
    description?: string;
    status?: 'open' | 'completed' | 'closed';
    battleRecordIds?: string[];
  }
) => {
  const session = await db
    .select()
    .from(reimbursementSessions)
    .where(and(eq(reimbursementSessions.id, sessionId), eq(reimbursementSessions.guildId, guildId)))
    .get();

  if (!session) {
    throw new AppError(404, '补装 session 不存在');
  }

  if (payload.battleRecordIds && session.status !== 'open') {
    throw new AppError(409, '仅开放中的补装 session 可调整关联战斗记录');
  }

  if (payload.battleRecordIds) {
    const nextBattleRecords = await db
      .select()
      .from(battleRecords)
      .where(and(eq(battleRecords.guildId, guildId), inArray(battleRecords.id, payload.battleRecordIds)))
      .all();

    if (nextBattleRecords.length !== payload.battleRecordIds.length) {
      throw new AppError(400, '存在无效的战斗记录');
    }

    const blockedRecord = nextBattleRecords.find(
      (record) => !record.isDeath || (record.reimbursementSessionId && record.reimbursementSessionId !== sessionId)
    );

    if (blockedRecord) {
      throw new AppError(409, '存在已被其他 session 占用或非死亡的战斗记录');
    }

    const currentBattleRecords = await db
      .select()
      .from(battleRecords)
      .where(eq(battleRecords.reimbursementSessionId, sessionId))
      .all();
    const currentIds = new Set(currentBattleRecords.map((record) => record.id));
    const nextIds = new Set(payload.battleRecordIds);
    const removedIds = currentBattleRecords.filter((record) => !nextIds.has(record.id)).map((record) => record.id);
    const addedRecords = nextBattleRecords.filter((record) => !currentIds.has(record.id));
    const now = new Date();

    if (removedIds.length > 0) {
      const linkedReimbursementRecords = await db
        .select()
        .from(reimbursementRecords)
        .where(and(eq(reimbursementRecords.sessionId, sessionId), inArray(reimbursementRecords.battleRecordId, removedIds)))
        .all();

      if (linkedReimbursementRecords.length > 0) {
        await db.delete(reimbursementRecords).where(inArray(reimbursementRecords.id, linkedReimbursementRecords.map((record) => record.id)));
      }

      await db
        .update(battleRecords)
        .set({
          reimbursementSessionId: null,
          updatedAt: now,
        })
        .where(inArray(battleRecords.id, removedIds));
    }

    if (addedRecords.length > 0) {
      const activeRules = await db
        .select()
        .from(reimbursementAutoApprovalRules)
        .where(and(eq(reimbursementAutoApprovalRules.guildId, guildId), eq(reimbursementAutoApprovalRules.enabled, true)))
        .orderBy(asc(reimbursementAutoApprovalRules.priority), asc(reimbursementAutoApprovalRules.createdAt))
        .all();

      for (const battleRecord of addedRecords) {
        await db
          .update(battleRecords)
          .set({
            reimbursementSessionId: sessionId,
            updatedAt: now,
          })
          .where(eq(battleRecords.id, battleRecord.id));
        await createReimbursementRecordForBattleRecord(db, session, battleRecord, activeRules);
      }
    }
  }

  const nextStatus = payload.status ?? session.status;
  const now = new Date();

  await db
    .update(reimbursementSessions)
    .set({
      title: payload.title ? payload.title.trim() : session.title,
      description: payload.description !== undefined ? normalizeOptionalText(payload.description) : session.description,
      status: nextStatus,
      closedByUserId: nextStatus === 'open' ? null : userId,
      closedAt: nextStatus === 'open' ? null : now,
      updatedAt: now,
    })
    .where(eq(reimbursementSessions.id, sessionId));

  return {
    message: '补装 session 已更新',
    reimbursementSession: await buildSessionDetail(db, sessionId, guildId),
  };
};
