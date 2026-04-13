export interface GuildSummary {
  id: string;
  name: string;
  tag: string;
  participants: number;
  kills: number;
  deaths: number;
}

export interface BattleReportSummary {
  id: string;
  startTime: string; // ISO string
  aggregatedCount: number; // 0 if single
  guilds: GuildSummary[];
  totalParticipants: number;
  totalKills?: number;
  totalDeaths: number;
  ourParticipants: number;
  ourKills: number;
  ourDeaths: number;
}

export interface AggregationGroup {
  id: string;
  battleIds: string[];
}

export interface StatsRecord {
  id: string;
  name: string;
  participants: number;
  kills: number;
  deaths: number;
  killFame: number;
  deathFame: number;
}

export interface PlayerStatRecord {
  id: string;
  name: string;
  weapon: string; // icon url
  guild: string;
  alliance: string;
  ip: number;
  kills: number;
  deaths: number;
  killFame: number;
  deathFame: number;
}

export interface PlayerDeathInfo {
  name: string;
  guild: string;
  alliance: string;
  ip: number;
  weapon: string; // icon url
  equipment: { slot: string; url: string }[];
  inventory: { url: string; count: number }[];
}

export interface DeathRecord {
  id: string;
  time: string;
  killer: PlayerDeathInfo;
  victim: PlayerDeathInfo;
  fame: number;
}
