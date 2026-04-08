import { drizzle } from 'drizzle-orm/d1';

export type DbClient = ReturnType<typeof drizzle>;

export type EquipmentItem = {
  itemKey: string;
  itemName: string;
  slot?: string;
  tier: number;
  enchantmentLevel: number;
  quantity: number;
};

export type AutoApprovalConditions = {
  minEstimatedValue?: number;
  maxEstimatedValue?: number;
  memberIds?: string[];
  gameCharacterIds?: string[];
  equipmentKeys?: string[];
  pLevels?: number[];
};
