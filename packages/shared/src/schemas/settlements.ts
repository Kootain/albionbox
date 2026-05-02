import { z } from 'zod'
import { RankingType } from './rankings'

export const PlatformTypeSchema = z.enum(['kook', 'discord'])
export type PlatformType = z.infer<typeof PlatformTypeSchema>

export const RewardTypeSchema = z.enum(['MIGHT_REWARD', 'MIGHT_TOP_REWARD', 'RESOURCE_REWARD'])
export type RewardType = z.infer<typeof RewardTypeSchema>

export const ResourceColorSchema = z.enum(['green', 'blue', 'purple', 'gold'])
export type ResourceColor = z.infer<typeof ResourceColorSchema>

export const ResourceCountsSchema = z.object({
  green: z.coerce.number().min(0).default(0),
  blue: z.coerce.number().min(0).default(0),
  purple: z.coerce.number().min(0).default(0),
  gold: z.coerce.number().min(0).default(0),
})

export const SettlementResourceImportRowSchema = z.object({
  username: z.string().min(1).optional(),
  kookId: z.string().min(1).optional(),
  discordId: z.string().min(1).optional(),
  green: z.coerce.number().min(0).default(0),
  blue: z.coerce.number().min(0).default(0),
  purple: z.coerce.number().min(0).default(0),
  gold: z.coerce.number().min(0).default(0),
}).refine((v) => Boolean(v.username || v.kookId || v.discordId), {
  message: 'one of username/kookId/discordId is required',
})

export type SettlementResourceImportRow = z.infer<typeof SettlementResourceImportRowSchema>

export const SettlementConfigSchema = z.object({
  version: z.literal('v1'),
  mightReward: z.object({
    enabledTypes: z.array(z.nativeEnum(RankingType)),
    threshold: z.coerce.number().min(0),
    ratio: z.coerce.number().min(0).optional(),
    ratioByType: z.record(z.string(), z.coerce.number().min(0)).optional(),
    effectivePolicy: z.literal('ZERO_BELOW_THRESHOLD').default('ZERO_BELOW_THRESHOLD'),
  }).refine((v) => {
    if (v.ratioByType) {
      return v.enabledTypes.every((t) => typeof v.ratioByType?.[t] === 'number')
    }
    return typeof v.ratio === 'number'
  }, {
    message: 'ratioByType must include all enabledTypes (or ratio must be provided)',
  }),
  mightTopReward: z.object({
    enabledTypes: z.array(z.nativeEnum(RankingType)),
    topConfigByType: z.record(z.string(), z.object({
      rewards: z.array(z.object({
        rank: z.coerce.number().int().min(1),
        coinAmount: z.coerce.number().min(0),
      })),
    })),
  }),
  resourceReward: z.object({
    powercore: z.object({
      coinPerUnitByColor: ResourceCountsSchema,
    }),
    energycrystal: z.object({
      coinPerUnitByColor: ResourceCountsSchema,
    }),
    imports: z.object({
      powercoreTable: z.array(SettlementResourceImportRowSchema).default([]),
      energycrystalTable: z.array(SettlementResourceImportRowSchema).default([]),
    }),
  }),
})

export type SettlementConfig = z.infer<typeof SettlementConfigSchema>

export const SettlementPresetSchema = SettlementConfigSchema.omit({
  resourceReward: true,
}).extend({
  resourceReward: SettlementConfigSchema.shape.resourceReward.omit({
    imports: true,
  }),
})

export type SettlementPreset = z.infer<typeof SettlementPresetSchema>

export const CreateSettlementCycleSchema = z.object({
  guildId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  config: SettlementConfigSchema,
})

export type CreateSettlementCycleInput = z.infer<typeof CreateSettlementCycleSchema>

export const SettlementCycleSchema = z.object({
  id: z.string().uuid(),
  guildId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  rankingIds: z.string(),
  config: z.string(),
  createdAt: z.string(),
  createdByUserId: z.string().optional(),
})

export const SettlementDetailSchema = z.object({
  id: z.string().uuid(),
  guildId: z.string().min(1),
  settlementId: z.string().uuid(),
  recipientKey: z.string().min(1),
  rewardType: z.string().min(1),
  subType: z.string().min(1),
  username: z.string().optional(),
  platformId: z.string().optional(),
  platformType: z.string().optional(),
  coinAmount: z.coerce.number(),
  isPaid: z.boolean(),
  paidAt: z.string().optional(),
  paidByUserId: z.string().optional(),
  detail: z.string(),
  createdAt: z.string(),
})

export const ListSettlementCyclesResponseSchema = z.object({
  items: z.array(SettlementCycleSchema),
})

export const SettlementColumnSchema = z.object({
  key: z.string().min(1),
  rewardType: z.string().min(1),
  subType: z.string().min(1),
})

export const SettlementAggregatedRowSchema = z.object({
  recipientKey: z.string().min(1),
  username: z.string().optional(),
  platformId: z.string().optional(),
  platformType: z.string().optional(),
  values: z.record(z.string(), z.coerce.number()),
  total: z.coerce.number(),
  isPaid: z.boolean(),
})

export const GetSettlementAggregatedResponseSchema = z.object({
  cycle: SettlementCycleSchema,
  columns: z.array(SettlementColumnSchema),
  rows: z.array(SettlementAggregatedRowSchema),
})

export const GetSettlementDetailsResponseSchema = z.object({
  cycle: SettlementCycleSchema,
  details: z.array(SettlementDetailSchema),
})

export const ToggleSettlementPaidSchema = z.object({
  recipientKey: z.string().min(1),
  isPaid: z.boolean(),
})

export type ToggleSettlementPaidInput = z.infer<typeof ToggleSettlementPaidSchema>
