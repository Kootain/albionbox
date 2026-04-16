
export enum AlbionServer {
  ASIA = 'asia',
  US = 'us',
  EU = 'eu'
}

export interface AlbionOfficialPlayer {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  killFame: number;
  guildName: string;
  guildId: string;
  allianceName: string;
  allianceId: string;
}

export interface AlbionOfficialGuild {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  killFame: number;
  alliance: string;
  allianceId: string;
}

export interface AlbionOfficialAlliance {
  id: string;
  name: string;
  kills: number;
  deaths: number;
  killFame: number;
}

export interface AlbionItem {
  Type: string;
  Count: number;
  Quality: number;
  ActiveSpells: string[];
  PassiveSpells: string[];
  LegendarySoul: string | null;
}

export interface AlbionEquipment {
  MainHand: AlbionItem | null;
  OffHand: AlbionItem | null;
  Head: AlbionItem | null;
  Armor: AlbionItem | null;
  Shoes: AlbionItem | null;
  Bag: AlbionItem | null;
  Cape: AlbionItem | null;
  Mount: AlbionItem | null;
  Potion: AlbionItem | null;
  Food: AlbionItem | null;
}

export interface AlbionEventPlayer {
  AverageItemPower: number;
  Equipment: AlbionEquipment;
  Inventory: (AlbionItem | null)[];
  Name: string;
  Id: string;
  GuildName: string;
  GuildId: string;
  AllianceName: string;
  AllianceId: string;
  AllianceTag: string;
  Avatar: string;
  AvatarRing: string;
  DeathFame: number;
  KillFame: number;
  FameRatio: number;
  DamageDone?: number;
  SupportHealingDone?: number;
}

export interface AlbionOfficialEvent {
  numberOfParticipants: number;
  groupMemberCount: number;
  EventId: number;
  TimeStamp: string;
  Version: number;
  Killer: AlbionEventPlayer;
  Victim: AlbionEventPlayer;
  TotalVictimKillFame: number;
  Location: string | null;
  Participants: AlbionEventPlayer[];
  GroupMembers: AlbionEventPlayer[];
  GvGMatch: string | null;
  BattleId: number;
  KillArea: string;
  Category: string | null;
  Type: string;
}

export interface AlbionOfficialBattle {
  id: number;
  startTime: string;
  endTime: string;
  timeout: string;
  totalFame: number;
  totalKills: number;
  clusterName: string | null;
  players: Record<string, AlbionOfficialPlayer>;
  guilds: Record<string, AlbionOfficialGuild>;
  alliances: Record<string, AlbionOfficialAlliance>;
  battle_TIMEOUT: number;
}

export interface AlbionSearchResultPlayer {
  Id: string;
  Name: string;
  GuildId: string;
  GuildName: string;
  AllianceId: string;
  AllianceName: string;
  Avatar: string;
  AvatarRing: string;
  KillFame: number;
  DeathFame: number;
  FameRatio: number;
  totalKills: number | null;
  gvgKills: number | null;
  gvgWon: number | null;
}

export interface AlbionSearchResultGuild {
  Id: string;
  Name: string;
  AllianceId: string;
  AllianceName: string;
  KillFame: number | null;
  DeathFame: number;
}

export interface AlbionSearchResult {
  guilds: AlbionSearchResultGuild[];
  players: AlbionSearchResultPlayer[];
}