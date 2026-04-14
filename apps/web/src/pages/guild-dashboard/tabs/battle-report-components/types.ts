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
  regearTicketId?: string | null;
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

