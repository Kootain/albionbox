import { z } from 'zod'

export const CreateBindRequestSchema = z.object({
  gameId: z.string().min(1),
  server: z.enum(['asia', 'eu', 'us']),
})
