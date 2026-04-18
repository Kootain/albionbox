import { z } from 'zod'

export enum ApplyStatus {
  BINDING = 'binding',
  BIND_FAILED = 'bind_failed',
  PENDING_AUDIT = 'pending_audit',
  PENDING_REGEAR = 'pending_regear',
  REJECT = 'reject',
  DONE = 'done'
}

export const ApplyDetailSchema = z.object({
  killerName: z.string().optional(),
  killerGuild: z.string().optional(),
  killerIP: z.number().optional(),
  victimName: z.string().optional(),
  victimGuild: z.string().optional(),
  victimIP: z.number().optional(),
  killFame: z.number().optional(),
  timestamp: z.string().optional(),
  mapName: z.string().optional(),
  assists: z.number().optional()
})

export const RegearApplySchema = z.object({
  id: z.string().uuid(),
  msgId: z.string(),
  msgUsername: z.string().optional(),
  msgUserid: z.string().optional(),
  msgGuild: z.string().optional(),
  msgChannel: z.string().optional(),
  createTime: z.string(),
  lastStatusTime: z.string(),
  regearId: z.string().optional(),
  regearTicketId: z.string().optional(),
  eventId: z.string().optional(),
  battleId: z.string().optional(),
  applyMeta: z.string().optional(), // Expected JSON string or object depending on parsing, keeping as string
  status: z.nativeEnum(ApplyStatus),
  victimName: z.string().optional(),
  victimGuild: z.string().optional(),
  applyDetail: z.string().optional(), // JSON string
})

export const CreateRegearApplySchema = z.object({
  msgId: z.string(),
  msgUsername: z.string().optional(),
  msgUserid: z.string().optional(),
  msgGuild: z.string().optional(),
  msgChannel: z.string().optional(),
  applyMeta: z.any().optional(), // Can accept any and we will stringify
  victimName: z.string().optional(),
  victimGuild: z.string().optional(),
  applyDetail: ApplyDetailSchema.optional()
})

export const UpdateApplyStatusSchema = z.object({
  status: z.nativeEnum(ApplyStatus)
})

export const BindRegearApplySchema = z.object({
  regearId: z.string()
})

export const UpdateApplyDetailSchema = z.object({
  applyDetail: ApplyDetailSchema
})

export const ListRegearAppliesQuerySchema = z.object({
  msgGuild: z.string().min(1).optional(),
  status: z.nativeEnum(ApplyStatus).optional(),
  msgChannel: z.string().min(1).optional(),
  msgUserid: z.string().min(1).optional(),
  victimName: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const ListRegearAppliesResponseSchema = z.object({
  items: z.array(RegearApplySchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
})

export type ListRegearAppliesQuery = z.infer<typeof ListRegearAppliesQuerySchema>
export type ListRegearAppliesResponse = z.infer<typeof ListRegearAppliesResponseSchema>

export const ListRegearApplySupplementCandidatesQuerySchema = z.object({
  msgGuild: z.string().min(1),
  startTime: z.string().optional(),
})

export const ListRegearApplySupplementCandidatesResponseSchema = z.array(RegearApplySchema)

export type ListRegearApplySupplementCandidatesQuery = z.infer<typeof ListRegearApplySupplementCandidatesQuerySchema>
export type ListRegearApplySupplementCandidatesResponse = z.infer<typeof ListRegearApplySupplementCandidatesResponseSchema>


export type ApplyMeta = {
    imageUrl: string
    idx: number
    total: number
}