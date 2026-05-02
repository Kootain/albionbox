import assert from 'node:assert/strict'
import { generateMightRewardDetails, generateMightTopRewardDetails, generateResourceRewardDetails } from './generators'

const baseConfig: any = {
  version: 'v1',
  mightReward: {
    enabledTypes: ['PVE'],
    threshold: 10,
    ratioByType: { PVE: 2 },
    effectivePolicy: 'ZERO_BELOW_THRESHOLD',
  },
  mightTopReward: {
    enabledTypes: ['PVE'],
    topConfigByType: {
      PVE: { rewards: [{ rank: 1, coinAmount: 100 }, { rank: 2, coinAmount: 50 }] },
    },
  },
  resourceReward: {
    powercore: { coinPerUnitByColor: { green: 10, blue: 0, purple: 0, gold: 0 } },
    energycrystal: { coinPerUnitByColor: { green: 0, blue: 0, purple: 0, gold: 0 } },
    imports: { powercoreTable: [], energycrystalTable: [] },
  },
}

const rankingDataByType = new Map<string, Map<string, number>>()
rankingDataByType.set('PVE', new Map([
  ['alice', 100000],
  ['bob', 90000],
]))
const baselineRankingDataByType = new Map<string, Map<string, number>>()
baselineRankingDataByType.set('PVE', new Map([
  ['alice', 50000],
  ['bob', 90000],
]))

const mightReward = generateMightRewardDetails({
  guildId: 'g1',
  settlementId: 's1',
  now: new Date().toISOString(),
  config: baseConfig,
  rankingDataByType,
})

const aliceReward = mightReward.find(d => d.username === 'alice')
const bobReward = mightReward.find(d => d.username === 'bob')
assert.ok(aliceReward)
assert.ok(bobReward)
assert.equal(aliceReward.coinAmount, 20)
assert.equal(bobReward.coinAmount, 0)

const mightTop = generateMightTopRewardDetails({
  guildId: 'g1',
  settlementId: 's1',
  now: new Date().toISOString(),
  config: baseConfig,
  rankingDataByType,
  baselineRankingDataByType,
})

assert.equal(mightTop.length, 2)
assert.equal(mightTop[0].coinAmount, 100)
assert.equal(mightTop[1].coinAmount, 50)
const top1 = JSON.parse(mightTop[0].detail) as any
const top2 = JSON.parse(mightTop[1].detail) as any
assert.equal(top1.snapshotMight, 10)
assert.equal(top1.effectiveMight, 5)
assert.equal(top2.snapshotMight, 9)
assert.equal(top2.effectiveMight, 0)

const resourceConfig: any = structuredClone(baseConfig)
resourceConfig.resourceReward.imports.powercoreTable = [
  { kookId: 'k1', green: 2, blue: 0, purple: 0, gold: 0 },
]

const resources = generateResourceRewardDetails({
  guildId: 'g1',
  settlementId: 's1',
  now: new Date().toISOString(),
  config: resourceConfig,
})

assert.equal(resources.length, 1)
assert.equal(resources[0].coinAmount, 20)
assert.equal(resources[0].recipientKey, 'platform:kook:k1')

console.log('settlements generators smoke passed')
