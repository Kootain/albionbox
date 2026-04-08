import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { CreateApprovalRuleSchema, UpdateApprovalRuleSchema, UpdateRulePrioritiesSchema } from '@albionbox/shared'
import { regearApprovalRules } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'

const router = new Hono<{ Bindings: Env }>()

router.use('*', authMiddleware)

router.get('/:guildId/regear_approval_rules', guildPermMiddleware(['regear:configure']), async (c) => {
  const guildId = c.req.param('guildId')
  const db = drizzle(c.env.DB)
  const rules = await db.select().from(regearApprovalRules).where(eq(regearApprovalRules.guildId, guildId)).all()
  return c.json(rules)
})

router.post('/:guildId/regear_approval_rules',
  guildPermMiddleware(['regear:configure']),
  zValidator('json', CreateApprovalRuleSchema),
  async (c) => {
    const guildId = c.req.param('guildId')
    const { name, condition, action, priority, enabled } = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const ruleId = crypto.randomUUID()
    await db.insert(regearApprovalRules).values({
      id: ruleId,
      guildId,
      name,
      condition: JSON.stringify(condition),
      action,
      priority,
      enabled,
      createdAt: new Date().toISOString(),
    }).execute()
    return c.json({ id: ruleId }, 201)
  }
)

router.put('/:guildId/regear_approval_rules/priorities',
  guildPermMiddleware(['regear:configure']),
  zValidator('json', UpdateRulePrioritiesSchema),
  async (c) => {
    const guildId = c.req.param('guildId')
    const { ids } = c.req.valid('json')
    const db = drizzle(c.env.DB)
    await Promise.all(
      ids.map((id, index) =>
        db.update(regearApprovalRules)
          .set({ priority: index })
          .where(and(eq(regearApprovalRules.id, id), eq(regearApprovalRules.guildId, guildId)))
          .execute()
      )
    )
    return c.json({ message: '优先级已更新' })
  }
)

router.put('/:guildId/regear_approval_rules/:ruleId',
  guildPermMiddleware(['regear:configure']),
  zValidator('json', UpdateApprovalRuleSchema),
  async (c) => {
    const { guildId, ruleId } = c.req.param()
    const updates = c.req.valid('json')
    const db = drizzle(c.env.DB)

    const rule = await db.select().from(regearApprovalRules)
      .where(and(eq(regearApprovalRules.id, ruleId), eq(regearApprovalRules.guildId, guildId)))
      .get()
    if (!rule) return c.json({ error: '规则不存在' }, 404)

    await db.update(regearApprovalRules).set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.condition !== undefined && { condition: JSON.stringify(updates.condition) }),
      ...(updates.action !== undefined && { action: updates.action }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    }).where(eq(regearApprovalRules.id, ruleId)).execute()

    return c.json({ message: '规则已更新' })
  }
)

router.delete('/:guildId/regear_approval_rules/:ruleId',
  guildPermMiddleware(['regear:configure']),
  async (c) => {
    const { guildId, ruleId } = c.req.param()
    const db = drizzle(c.env.DB)

    const rule = await db.select().from(regearApprovalRules)
      .where(and(eq(regearApprovalRules.id, ruleId), eq(regearApprovalRules.guildId, guildId)))
      .get()
    if (!rule) return c.json({ error: '规则不存在' }, 404)

    await db.delete(regearApprovalRules).where(eq(regearApprovalRules.id, ruleId)).execute()
    return c.json({ message: '规则已删除' })
  }
)

export { router as regearApprovalRulesRouter }
