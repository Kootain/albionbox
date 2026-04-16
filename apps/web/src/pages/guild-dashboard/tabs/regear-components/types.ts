export type RegearOrderStatus = 'active' | 'completed';

export interface RegearOrder {
  id: string;
  startTime: string;
  endTime: string;
  status: RegearOrderStatus;
  battleIds: string[];
  stats: {
    totalDeaths: number;
    reviewedDeaths: number;
    pendingReview: number;
    pendingRegear: number;
    completedRegear: number;
    // excludedRegear: number;
    // rejectedRegear: number;
  };
}

export type RegearRecordStatus = 'excluded' | 'pending_review' | 'rejected' | 'pending_regear' | 'completed';

export interface RegearRecord {
  id: string;
  eventId?: string;
  battleId?: string;
  playerId?: string;
  status: RegearRecordStatus;
  reviewComment?: string;
  deathTime: string;
  deathFame: number;
  playerName: string;
  ip: number;
  equipment: { slot: string; url: string; type: string }[];
  mainHandType?: string; // For Weapon Icon + Name
  guildId: string;
}

export interface RegearConfig {
  allowedSlots: string[]; // e.g. ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape']
  defaultPLevel?: number;
  policies?: {
    noRegear: { players: { id: string; name: string }[] };
    levelGroups: { id: string; name: string; maxPLevel: number; players: { id: string; name: string }[] }[];
  };
}

export interface RegearOrderDetail {
  order: RegearOrder;
  config: RegearConfig;
  records: RegearRecord[];
  battleEvents?: Record<string, string[]>;
}
