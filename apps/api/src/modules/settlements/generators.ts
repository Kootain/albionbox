import type { SettlementConfig } from '@albionbox/shared'

export type SettlementDetailInsert = {
  id: string
  guildId: string
  settlementId: string
  recipientKey: string
  rewardType: string
  subType: string
  username: string | null
  platformId: string | null
  platformType: string | null
  coinAmount: number
  isPaid: boolean
  paidAt: string | null
  paidByUserId: string | null
  detail: string
  createdAt: string
}

export function parseRankingSnapshotData(raw: string): Map<string, number> {
  const parsed = JSON.parse(raw) as unknown
  const result = new Map<string, number>()

  if (!Array.isArray(parsed)) return result
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const keys = Object.keys(item as any)
    if (keys.length === 0) continue
    const username = keys[0]
    const rawValue = (item as any)[username]
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    if (!username) continue
    if (Number.isFinite(value)) {
      result.set(username, value)
    }
  }

  return result
}

export function mightFromRaw(raw: number): number {
  return Math.round(raw / 10000)
}

export function buildRecipientKey(input: { username?: string | null; platformType?: string | null; platformId?: string | null }) {
  if (input.username) return `username:${input.username}`
  if (input.platformType && input.platformId) return `platform:${input.platformType}:${input.platformId}`
  return null
}

export function generateMightRewardDetails(args: {
  guildId: string
  settlementId: string
  now: string
  config: SettlementConfig
  rankingDataByType: Map<string, Map<string, number>>
}): SettlementDetailInsert[] {
  const result: SettlementDetailInsert[] = []
  const { guildId, settlementId, now, config, rankingDataByType } = args

  for (const type of config.mightReward.enabledTypes) {
    const data = rankingDataByType.get(type)
    if (!data) continue
    const ratio = config.mightReward.ratioByType?.[type] ?? config.mightReward.ratio ?? 0

    for (const [username, rawMight] of data.entries()) {
      const totalMight = mightFromRaw(rawMight)
      const overThreshold = totalMight >= config.mightReward.threshold
      const effectiveMight = overThreshold ? totalMight : 0
      const coinAmount = Math.round(effectiveMight * ratio)
      const recipientKey = buildRecipientKey({ username })
      if (!recipientKey) continue

      result.push({
        id: crypto.randomUUID(),
        guildId,
        settlementId,
        recipientKey,
        rewardType: 'MIGHT_REWARD',
        subType: type,
        username,
        platformId: null,
        platformType: null,
        coinAmount,
        isPaid: false,
        paidAt: null,
        paidByUserId: null,
        detail: JSON.stringify({
          totalMightRaw: rawMight,
          totalMight,
          effectiveMight,
          overThreshold,
          threshold: config.mightReward.threshold,
          ratio,
        }),
        createdAt: now,
      })
    }
  }

  return result
}

export function generateMightTopRewardDetails(args: {
  guildId: string
  settlementId: string
  now: string
  config: SettlementConfig
  rankingDataByType: Map<string, Map<string, number>>
  baselineRankingDataByType?: Map<string, Map<string, number>>
}): SettlementDetailInsert[] {
  const result: SettlementDetailInsert[] = []
  const { guildId, settlementId, now, config, rankingDataByType, baselineRankingDataByType } = args

  for (const type of config.mightTopReward.enabledTypes) {
    const data = rankingDataByType.get(type)
    if (!data) continue

    const baseline = baselineRankingDataByType?.get(type) ?? new Map<string, number>()
    const list = Array.from(data.entries()).map(([username, raw]) => {
      const might = mightFromRaw(raw)
      const baselineRaw = baseline.get(username) ?? 0
      const baselineMight = mightFromRaw(baselineRaw)
      const effectiveMightRaw = Math.max(0, raw - baselineRaw)
      const effectiveMight = Math.max(0, might - baselineMight)
      return {
        username,
        raw,
        might,
        baselineRaw,
        baselineMight,
        effectiveMightRaw,
        effectiveMight,
      }
    })

    list.sort((a, b) => {
      const diff = b.effectiveMight - a.effectiveMight
      if (diff !== 0) return diff
      const diff2 = b.might - a.might
      if (diff2 !== 0) return diff2
      return a.username.localeCompare(b.username)
    })

    const rewards = config.mightTopReward.topConfigByType[type]?.rewards ?? []
    const rewardByRank = new Map<number, number>()
    let maxConfiguredRank = 0
    for (const r of rewards) {
      if (r.rank > maxConfiguredRank) maxConfiguredRank = r.rank
      rewardByRank.set(r.rank, r.coinAmount)
    }

    const topLimit = Math.max(10, maxConfiguredRank)
    for (let rank = 1; rank <= topLimit; rank++) {
      const idx = rank - 1
      if (idx < 0 || idx >= list.length) break
      const item = list[idx]
      const recipientKey = buildRecipientKey({ username: item.username })
      if (!recipientKey) continue
      const snapshotMightRaw = item.raw
      const snapshotMight = item.might
      const effectiveMightRaw = item.effectiveMightRaw
      const effectiveMight = item.effectiveMight
      const coinAmount = rewardByRank.get(rank) ?? 0

      result.push({
        id: crypto.randomUUID(),
        guildId,
        settlementId,
        recipientKey,
        rewardType: 'MIGHT_TOP_REWARD',
        subType: type,
        username: item.username,
        platformId: null,
        platformType: null,
        coinAmount,
        isPaid: false,
        paidAt: null,
        paidByUserId: null,
        detail: JSON.stringify({
          rank,
          totalMightRaw: snapshotMightRaw,
          totalMight: snapshotMight,
          snapshotMightRaw,
          snapshotMight,
          effectiveMightRaw,
          effectiveMight,
        }),
        createdAt: now,
      })
    }
  }

  return result
}

export function generateResourceRewardDetails(args: {
  guildId: string
  settlementId: string
  now: string
  config: SettlementConfig
}): SettlementDetailInsert[] {
  const result: SettlementDetailInsert[] = []
  const { guildId, settlementId, now, config } = args

  const resourceImports = [
    { subType: 'POWERCORE', rows: config.resourceReward.imports.powercoreTable, coins: config.resourceReward.powercore.coinPerUnitByColor },
    { subType: 'ENERGYCRYSTAL', rows: config.resourceReward.imports.energycrystalTable, coins: config.resourceReward.energycrystal.coinPerUnitByColor },
  ] as const

  for (const group of resourceImports) {
    for (const row of group.rows) {
      const platformType = row.kookId ? 'kook' : row.discordId ? 'discord' : null
      const platformId = row.kookId ?? row.discordId ?? null
      const username = row.username ?? null

      const recipientKey = buildRecipientKey({ username, platformType, platformId })
      if (!recipientKey) continue

      const totalUnits = row.green + row.blue + row.purple + row.gold
      if (totalUnits <= 0) continue

      const coinAmount =
        row.green * group.coins.green +
        row.blue * group.coins.blue +
        row.purple * group.coins.purple +
        row.gold * group.coins.gold

      result.push({
        id: crypto.randomUUID(),
        guildId,
        settlementId,
        recipientKey,
        rewardType: 'RESOURCE_REWARD',
        subType: group.subType,
        username,
        platformId,
        platformType,
        coinAmount,
        isPaid: false,
        paidAt: null,
        paidByUserId: null,
        detail: JSON.stringify({
          counts: { green: row.green, blue: row.blue, purple: row.purple, gold: row.gold },
          coinPerUnit: group.coins,
          totalUnits,
        }),
        createdAt: now,
      })
    }
  }

  return result
}
