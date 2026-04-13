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
  };
}

export type RegearRecordStatus = 'excluded' | 'pending_review' | 'rejected' | 'pending_regear' | 'completed';

export interface RegearRecord {
  id: string;
  eventId?: string;
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
}

export interface RegearOrderDetail {
  order: RegearOrder;
  config: RegearConfig;
  records: RegearRecord[];
}
