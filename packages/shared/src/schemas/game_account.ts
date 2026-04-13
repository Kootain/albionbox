import { z } from 'zod'
import { id } from 'zod/locales'

export const CreateBindRequestSchema = z.object({
  username: z.string().min(1),
  server: z.enum(['asia', 'eu', 'us']),
})

export const CancelBindRequestSchema = z.object({
  id: z.uuid(),
})

export type { GameAccount, BindingToken } from '@albionbox/db'
