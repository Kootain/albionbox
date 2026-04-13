import { z } from 'zod'

export const CreateRegearTicketSchema = z.object({
  battleIds: z.array(z.string()).min(1),
  eventIds: z.array(z.string()).min(1),
  players: z.record(z.string(), z.string()).optional(),
  server: z.enum(['asia', 'eu', 'us']),
  config: z.record(z.string(), z.any()).default({}),
})

export const UpdateRegearTicketSchema = z.object({
  config: z.record(z.string(), z.any()).optional(),
  battleIds: z.array(z.string()).optional(),
  eventIds: z.array(z.string()).optional(),
})

export const UpdateRegearStatusSchema = z.object({
  status: z.enum(['pending_review', 'excluded', 'rejected', 'pending_regear', 'completed']),
  comment: z.string().optional(),
})
