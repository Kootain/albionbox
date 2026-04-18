import { z } from 'zod'

export const CreateRegearTicketSchema = z.object({
  battleEvents: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).refine(v => Object.keys(v).length > 0, { message: 'battleEvents 不能为空' }),
  players: z.record(z.string(), z.string()).optional(),
  applies: z.record(z.string(), z.string()).optional(), // eventId -> applyId
  server: z.enum(['asia', 'eu', 'us']),
  config: z.record(z.string(), z.any()).default({}),
  needApply: z.boolean().default(false),
})

export type CreateRegearTicketInput = z.infer<typeof CreateRegearTicketSchema>

export const UpdateRegearTicketSchema = z.object({
  config: z.record(z.string(), z.any()).optional(),
  battleIds: z.array(z.string()).optional(),
  eventIds: z.array(z.string()).optional(),
})

export type UpdateRegearTicketInput = z.infer<typeof UpdateRegearTicketSchema>

export const UpdateRegearStatusSchema = z.object({
  status: z.enum(['pending_review', 'excluded', 'rejected', 'pending_regear', 'completed']),
  comment: z.string().optional(),
})

export type UpdateRegearStatusInput = z.infer<typeof UpdateRegearStatusSchema>
