import { BattleReportSummary, StatsRecord, PlayerStatRecord, DeathRecord } from './types';

const MOCK_ITEM_URL = 'https://img.albionbox.com/v1/item/T8_CAPEITEM_SMUGGLER@3.png?count=1&quality=4';

export const mockBattleReports: BattleReportSummary[] = [
  {
    id: 'BR-1001',
    startTime: '2026-04-10T08:57:00Z',
    aggregatedCount: 3,
    guilds: [
      { id: 'g1', name: 'Blue Army', tag: 'BA', participants: 45, kills: 30, deaths: 15 },
      { id: 'g2', name: 'Money Guild', tag: 'MG', participants: 40, kills: 12, deaths: 40 },
      { id: 'g3', name: 'Elevate', tag: 'E', participants: 20, kills: 25, deaths: 5 },
    ],
    totalParticipants: 105,
    totalDeaths: 60,
    ourParticipants: 45,
    ourKills: 30,
    ourDeaths: 15,
  },
  {
    id: 'BR-1002',
    startTime: '2026-04-09T18:30:00Z',
    aggregatedCount: 0,
    guilds: [
      { id: 'g1', name: 'Blue Army', tag: 'BA', participants: 20, kills: 10, deaths: 5 },
      { id: 'g4', name: 'Sun', tag: 'SUN', participants: 25, kills: 5, deaths: 10 },
    ],
    totalParticipants: 45,
    totalDeaths: 15,
    ourParticipants: 20,
    ourKills: 10,
    ourDeaths: 5,
  }
];

export const mockAllianceStats: StatsRecord[] = [
  { id: 'a1', name: 'SQUAD', participants: 80, kills: 120, deaths: 40, killFame: 45000000, deathFame: 12000000 },
  { id: 'a2', name: 'OOPS', participants: 60, kills: 35, deaths: 110, killFame: 10000000, deathFame: 50000000 },
];

export const mockGuildStats: StatsRecord[] = [
  { id: 'g1', name: 'Blue Army', participants: 45, kills: 80, deaths: 20, killFame: 30000000, deathFame: 8000000 },
  { id: 'g2', name: 'Money Guild', participants: 40, kills: 20, deaths: 80, killFame: 8000000, deathFame: 35000000 },
];

export const mockPlayerStats: PlayerStatRecord[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `p${i}`,
  name: `Player_${i}`,
  weapon: MOCK_ITEM_URL,
  guild: i % 2 === 0 ? 'Blue Army' : 'Money Guild',
  alliance: i % 2 === 0 ? 'SQUAD' : 'OOPS',
  ip: 1400 + Math.floor(Math.random() * 200),
  kills: Math.floor(Math.random() * 10),
  deaths: Math.floor(Math.random() * 5),
  killFame: Math.floor(Math.random() * 1000000),
  deathFame: Math.floor(Math.random() * 500000),
}));

export const mockDeathRecords: DeathRecord[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `d${i}`,
  time: '2026-04-10T08:57:00Z',
  killer: {
    name: `Killer_${i}`,
    guild: 'Blue Army',
    alliance: 'SQUAD',
    ip: 1550,
    weapon: MOCK_ITEM_URL,
    equipment: Array(10).fill({ slot: 'head', url: MOCK_ITEM_URL }),
    inventory: []
  },
  victim: {
    name: `Victim_${i}`,
    guild: 'Money Guild',
    alliance: 'OOPS',
    ip: 1420,
    weapon: MOCK_ITEM_URL,
    equipment: Array(10).fill({ slot: 'head', url: MOCK_ITEM_URL }),
    inventory: Array(20).fill({ url: MOCK_ITEM_URL, count: Math.floor(Math.random() * 100) })
  },
  fame: 107176885,
}));