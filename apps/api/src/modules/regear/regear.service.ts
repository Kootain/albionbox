import { drizzle } from 'drizzle-orm/d1'
import { and, count, eq, inArray, sql } from 'drizzle-orm'
import {
  regearSessions, regearSessionBattles, regearRecords, regearApprovalLogs,
  battleDeaths, battleRecords, gameAccounts,
} from '@albionbox/db'
import { evaluateRecord } from './regear.pipeline.service'

// P级 = Tier + 附魔等级（T6_ITEM@2 → P8）
export function calculatePLevel(itemType: string): number {
  const m = itemType.match(/^T(\d+)_[^@]*(?:@(\d+))?/)
  if (!m) return 0
  return parseInt(m[1]) + parseInt(m[2] ?? '0')
}

type EquipmentSlot = { Type: string; Quality?: number } | null

function extractEquipmentItems(equipmentJson: string): string[] {
  try {
    const eq = JSON.parse(equipmentJson) as Record<string, EquipmentSlot>
    return Object.values(eq)
      .filter((v): v is { Type: string } => v !== null && typeof v?.Type === 'string')
      .map(v => v.Type)
  } catch {
    return []
  }
}

export async function createRegearSession(
  db: D1Database,
  guildId: string,
  createdBy: string,
  battleIds: string[],
) {
  const d = drizzle(db)
  const sessionId = crypto.randomUUID()
  const now = new Date().toISOString()

  await d.insert(regearSessions).values({ id: sessionId, guildId, createdBy, createdAt: now }).execute()
  await Promise.all(
    battleIds.map(bid =>
      d.insert(regearSessionBattles).values({ sessionId, battleRecordId: bid }).execute()
    )
  )
  await generateRegearRecords(d, db, sessionId, guildId, battleIds, now)
  return { sessionId }
}

async function generateRegearRecords(
  d: ReturnType<typeof drizzle>,
  db: D1Database,
  sessionId: string,
  guildId: string,
  battleIds: string[],
  now: string,
) {
  const [deaths, battleRecordRows] = await Promise.all([
    d.select().from(battleDeaths).where(inArray(battleDeaths.battleRecordId, battleIds)).all(),
    d.select().from(battleRecords).where(inArray(battleRecords.id, battleIds)).all(),
  ])

  const battleRecordMap = new Map(battleRecordRows.map(r => [r.id, r]))

  const existingDeathIds = await d.select({ battleDeathId: regearRecords.battleDeathId })
    .from(regearRecords)
    .where(eq(regearRecords.sessionId, sessionId))
    .all()
    .then(rows => new Set(rows.map(r => r.battleDeathId)))

  const newDeaths = deaths.filter(d => !existingDeathIds.has(d.id))
  if (newDeaths.length === 0) return

  for (const death of newDeaths) {
    const recordId = crypto.randomUUID()
    await d.insert(regearRecords).values({
      id: recordId,
      sessionId,
      battleDeathId: death.id,
      status: 'draft',
      createdAt: now,
    }).execute()

    const br = battleRecordMap.get(death.battleRecordId)
    if (br) {
      await evaluateRecord({
        regearRecord: { id: recordId, status: 'draft' },
        battleDeath: { albionPlayerId: death.albionPlayerId, equipment: death.equipment },
        battleRecord: { participants: br.participants },
        guildId,
      }, db)
    }
  }
}

export async function updateSessionBattles(
  db: D1Database,
  sessionId: string,
  battleIds: string[],
) {
  const d = drizzle(db)
  const session = await d.select().from(regearSessions).where(eq(regearSessions.id, sessionId)).get()
  if (!session) throw Object.assign(new Error('Session 不存在'), { status: 404 })
  if (session.status !== 'active') throw Object.assign(new Error('只能修改 active 状态的 Session'), { status: 400 })

  await d.delete(regearSessionBattles).where(eq(regearSessionBattles.sessionId, sessionId)).execute()
  await Promise.all(
    battleIds.map(bid =>
      d.insert(regearSessionBattles).values({ sessionId, battleRecordId: bid }).execute()
    )
  )
  await generateRegearRecords(d, db, sessionId, session.guildId, battleIds, new Date().toISOString())
  return { sessionId }
}

export async function completeSession(db: D1Database, sessionId: string) {
  const d = drizzle(db)
  const session = await d.select().from(regearSessions).where(eq(regearSessions.id, sessionId)).get()
  if (!session) throw Object.assign(new Error('Session 不存在'), { status: 404 })
  if (session.status !== 'active') throw Object.assign(new Error('只能完成 active 状态的 Session'), { status: 400 })

  await d.update(regearSessions).set({ status: 'completed' }).where(eq(regearSessions.id, sessionId)).execute()
  return { message: 'Session 已完成' }
}

export async function getSessionDetail(db: D1Database, sessionId: string, guildId: string) {
  const d = drizzle(db)
  const session = await d.select().from(regearSessions)
    .where(and(eq(regearSessions.id, sessionId), eq(regearSessions.guildId, guildId)))
    .get()
  if (!session) return null

  const [records, [progress]] = await Promise.all([
    d.select().from(regearRecords).where(eq(regearRecords.sessionId, sessionId)).all(),
    d.select({
      total: count(),
      approved: sql<number>`sum(case when ${regearRecords.status} in ('approved','done') then 1 else 0 end)`,
    }).from(regearRecords).where(eq(regearRecords.sessionId, sessionId)),
  ])

  return { ...session, records, progress: { total: progress.total, approvedOrDone: progress.approved } }
}

export async function getSessionSummary(db: D1Database, sessionId: string, guildId: string) {
  const d = drizzle(db)
  const session = await d.select().from(regearSessions)
    .where(and(eq(regearSessions.id, sessionId), eq(regearSessions.guildId, guildId)))
    .get()
  if (!session) return null

  const records = await d.select({
    recordId: regearRecords.id,
    status: regearRecords.status,
    equipment: battleDeaths.equipment,
    albionPlayerId: battleDeaths.albionPlayerId,
    playerName: battleDeaths.playerName,
  })
    .from(regearRecords)
    .innerJoin(battleDeaths, eq(regearRecords.battleDeathId, battleDeaths.id))
    .where(
      and(
        eq(regearRecords.sessionId, sessionId),
        inArray(regearRecords.status, ['approved', 'done']),
      )
    )
    .all()

  // 按 P 级汇总（全局）
  const byPLevel: Record<number, { count: number; items: string[] }> = {}
  // 按玩家分组
  const byPlayer: Record<string, { albionPlayerId: string; playerName: string; items: { type: string; pLevel: number }[] }> = {}

  for (const rec of records) {
    const items = extractEquipmentItems(rec.equipment)
    for (const item of items) {
      const p = calculatePLevel(item)
      if (!byPLevel[p]) byPLevel[p] = { count: 0, items: [] }
      byPLevel[p].count++
      byPLevel[p].items.push(item)
    }

    if (!byPlayer[rec.albionPlayerId]) {
      byPlayer[rec.albionPlayerId] = { albionPlayerId: rec.albionPlayerId, playerName: rec.playerName, items: [] }
    }
    for (const item of items) {
      byPlayer[rec.albionPlayerId].items.push({ type: item, pLevel: calculatePLevel(item) })
    }
  }

  return { byPLevel, byPlayer: Object.values(byPlayer) }
}

export async function transitionRecord(
  db: D1Database,
  recordId: string,
  fromStatus: string,
  toStatus: string,
  operatorId: string | null,
  isSystem: boolean,
  note: string | null,
) {
  const d = drizzle(db)
  const record = await d.select().from(regearRecords).where(eq(regearRecords.id, recordId)).get()
  if (!record) throw Object.assign(new Error('补装记录不存在'), { status: 404 })
  if (record.status !== fromStatus) {
    throw Object.assign(new Error(`当前状态为 ${record.status}，无法从 ${fromStatus} 转换`), { status: 400 })
  }

  const now = new Date().toISOString()
  await Promise.all([
    d.update(regearRecords).set({ status: toStatus as typeof record.status }).where(eq(regearRecords.id, recordId)).execute(),
    d.insert(regearApprovalLogs).values({
      id: crypto.randomUUID(),
      regearRecordId: recordId,
      fromStatus,
      toStatus,
      operatorId,
      isSystem,
      note,
      createdAt: now,
    }).execute(),
  ])
}

export async function submitRecord(
  db: D1Database,
  recordId: string,
  activeGameAccountId: string | null,
) {
  if (!activeGameAccountId) {
    throw Object.assign(new Error('请先设置激活游戏角色'), { status: 403 })
  }

  const d = drizzle(db)

  // 通过 activeGameAccountId 查出对应的 albion_player_id
  const account = await d.select({ albionPlayerId: gameAccounts.albionPlayerId })
    .from(gameAccounts)
    .where(eq(gameAccounts.id, activeGameAccountId))
    .get()

  if (!account?.albionPlayerId) {
    throw Object.assign(new Error('游戏账号未完成绑定，无法提交补装申请'), { status: 403 })
  }

  const record = await d.select({ battleDeathId: regearRecords.battleDeathId, status: regearRecords.status })
    .from(regearRecords)
    .where(eq(regearRecords.id, recordId))
    .get()
  if (!record) throw Object.assign(new Error('补装记录不存在'), { status: 404 })

  const death = await d.select({ albionPlayerId: battleDeaths.albionPlayerId })
    .from(battleDeaths)
    .where(eq(battleDeaths.id, record.battleDeathId))
    .get()
  if (!death) throw Object.assign(new Error('死亡记录不存在'), { status: 404 })

  if (death.albionPlayerId !== account.albionPlayerId) {
    throw Object.assign(new Error('只有本人才能提交补装申请'), { status: 403 })
  }

  await transitionRecord(db, recordId, 'draft', 'pending', null, false, null)
}
