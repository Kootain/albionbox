import { z } from 'zod'

const ConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('equipment_tier_check'),
    params: z.object({ min_p_level: z.number().int().min(1) }),
  }),
  z.object({ type: z.literal('participation_check') }),
])

export const CreateApprovalRuleSchema = z.object({
  name: z.string().min(1),
  condition: ConditionSchema,
  action: z.enum(['approve', 'reject']),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
})

export const UpdateApprovalRuleSchema = CreateApprovalRuleSchema.partial()

export const UpdateRulePrioritiesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})
