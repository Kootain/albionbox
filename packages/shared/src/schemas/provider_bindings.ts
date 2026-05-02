import { z } from 'zod'

export const ProviderSchema = z.enum(['kook', 'discord'])
export type Provider = z.infer<typeof ProviderSchema>

export const ListProviderBindingsQuerySchema = z.object({
  provider: ProviderSchema,
})

export type ListProviderBindingsQuery = z.infer<typeof ListProviderBindingsQuerySchema>

export const ProviderBindingItemSchema = z.object({
  guildMemberId: z.string().uuid(),
  provider: ProviderSchema,
  providerId: z.string().min(1),
  providerName: z.string().optional(),
  gameAccountId: z.string().uuid(),
  gameAccountUsername: z.string().min(1),
  albionPlayerId: z.string().min(1),
})

export type ProviderBindingItem = z.infer<typeof ProviderBindingItemSchema>

export const ListProviderBindingsResponseSchema = z.object({
  items: z.array(ProviderBindingItemSchema),
})

export type ListProviderBindingsResponse = z.infer<typeof ListProviderBindingsResponseSchema>

export const UpsertProviderBindingSchema = z.object({
  provider: ProviderSchema,
  providerId: z.string().min(1),
  providerName: z.string().optional(),
  gameAccount: z.object({
    username: z.string().min(1),
    albionPlayerId: z.string().min(1),
  }),
})

export type UpsertProviderBindingInput = z.infer<typeof UpsertProviderBindingSchema>

