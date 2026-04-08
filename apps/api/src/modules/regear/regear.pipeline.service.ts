import { drizzle } from 'drizzle-orm/d1'
import { and, asc, eq } from 'drizzle-orm'
import { regearApprovalRules, regearRecords, regearApprovalLogs } from '@albionbox/db'
import { calculatePLevel } from './regear.utils'

type EquipmentSlot = { Type: string } | null

export interface PipelineContext {
  regearRecord: { id: string; status: string }
  battleDeath: { albionPlayerId: string; equipment: string }
  battleRecord: { participants: string }
  guildId: string
}

type RuleCondition =
  | { type: 'equipment_tier_check'; params: { min_p_level: number } }
  | { type: 'participation_check' }

function evaluateCondition(condition: RuleCondition, ctx: PipelineContext): boolean {
  if (condition.type === 'equipment_tier_check') {
    const eq_data = (() => {
      try { return JSON.parse(ctx.battleDeath.equipment) as Record<string, EquipmentSlot> }
      catch { return {} }
    })()
    const pLevels = Object.values(eq_data)
      .filter((v): v is { Type: string } => v !== null && typeof v?.Type === 'string')
      .map(v => calculatePLevel(v.Type))
    const maxP = pLevels.length > 0 ? Math.max(...pLevels) : 0
    return maxP < condition.params.min_p_level
  }

  if (condition.type === 'participation_check') {
    const participants: string[] = (() => {
      try { return JSON.parse(ctx.battleRecord.participants) as string[] }
      catch { return [] }
    })()
    return !participants.includes(ctx.battleDeath.albionPlayerId)
  }

  return false
}

export async function evaluateRecord(ctx: PipelineContext, db: D1Database): Promise<void> {
  const d = drizzle(db)
  const rules = await d.select()
    .from(regearApprovalRules)
    .where(and(eq(regearApprovalRules.guildId, ctx.guildId), eq(regearApprovalRules.enabled, true)))
    .orderBy(asc(regearApprovalRules.priority))
    .all()

  for (const rule of rules) {
    let condition: RuleCondition
    try { condition = JSON.parse(rule.condition) as RuleCondition }
    catch { continue }

    if (!evaluateCondition(condition, ctx)) continue

    // 命中：直接从 draft 转到 approved 或 rejected（系统自动处理，跳过 pending）
    const toStatus = rule.action === 'approve' ? 'approved' : 'rejected'
    const now = new Date().toISOString()

    await Promise.all([
      d.update(regearRecords)
        .set({ status: toStatus as 'approved' | 'rejected' })
        .where(eq(regearRecords.id, ctx.regearRecord.id))
        .execute(),
      d.insert(regearApprovalLogs).values({
        id: crypto.randomUUID(),
        regearRecordId: ctx.regearRecord.id,
        fromStatus: 'draft',
        toStatus,
        operatorId: null,
        isSystem: true,
        note: `Rule: ${rule.name}`,
        createdAt: now,
      }).execute(),
    ])
    return // 短路：第一条命中即停止
  }
  // 无规则命中：记录保持 draft
}
