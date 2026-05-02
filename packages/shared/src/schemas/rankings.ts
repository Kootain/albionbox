import { z } from 'zod'

export enum RankingType {
  CASTLE = 'CASTLE',
  CORRUPTED = 'CORRUPTED',
  ENERGYCRYSTAL = 'ENERGYCRYSTAL',
  GATHERING = 'GATHERING',
  GVGSEASON = 'GVGSEASON',
  HELLDUNGEON = 'HELLDUNGEON',
  HELLGATE = 'HELLGATE',
  POWERCORE = 'POWERCORE',
  PVE = 'PVE',
  SMUGGLERS = 'SMUGGLERS',
  SPIDERS = 'SPIDERS',
  TREASURES = 'TREASURES'
}

export const CreateRankingSchema = z.object({
  guildId: z.string().min(1),
  rankingType: z.nativeEnum(RankingType),
  collectedAt: z.string().datetime(), // Validates ISO format
  data: z.any(), // Assuming array of objects `[{"Username1": score}, ...]`
})

export type CreateRankingInput = z.infer<typeof CreateRankingSchema>
