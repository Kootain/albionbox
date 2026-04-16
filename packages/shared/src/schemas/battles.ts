import { z } from 'zod'

export enum BattleType {
  MASS = 'MASS',
  SMALL_SCALE = 'SMALL_SCALE',
}

export const BattleTypeBitmask: Record<BattleType, number> = {
  [BattleType.MASS]: 1 << 0,
  [BattleType.SMALL_SCALE]: 1 << 1,
}

export function encodeBattleTypes(types: BattleType[]): number {
  return types.reduce((mask, type) => mask | (BattleTypeBitmask[type] ?? 0), 0)
}

export function decodeBattleTypes(mask: number): BattleType[] {
  return Object.values(BattleType).filter(type => (mask & BattleTypeBitmask[type]) !== 0)
}

export const BattleTagSchema = z.object({
  id: z.number().int().positive(),
  server: z.enum(['asia', 'eu', 'us']),
  guildId: z.string(),
  types: z.array(z.nativeEnum(BattleType)),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type BattleTag = z.infer<typeof BattleTagSchema>
