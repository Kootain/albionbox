import { z } from 'zod'

export const CreateRegearSessionSchema = z.object({
  battleIds: z.array(z.string().min(1)).min(1),
})

export const UpdateSessionBattlesSchema = z.object({
  battleIds: z.array(z.string().min(1)).min(1),
})

export const RejectRegearRecordSchema = z.object({
  note: z.string().min(1),
})
