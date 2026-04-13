import { z } from 'zod'

export const ApproveGuildSchema = z.object({
  albionGuildId: z.string().min(1),
  note: z.string().optional(),
})

export const RejectGuildSchema = z.object({
  note: z.string().optional(),
})

export const ApproveBindingSchema = z.object({
  id: z.uuid(),
  token: z.string().optional().nullable(),
  albionPlayerId: z.string().min(1),
  note: z.string().optional(),
})

export const RejectBindingSchema = z.object({
  note: z.string().optional(),
})
