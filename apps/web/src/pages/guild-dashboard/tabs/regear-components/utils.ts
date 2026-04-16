export function getBaseItemId(itemType: string): string {
  if (!itemType) return '';
  return itemType.replace(/^T\d_/, '').replace(/@\d+$/, '');
}

export function calculatePLevel(itemType: string): number {
  if (!itemType) return 0;
  const match = itemType.match(/T(\d+)/);
  const tier = match ? parseInt(match[1], 10) : 0;
  const enchantMatch = itemType.match(/@(\d+)/);
  const enchant = enchantMatch ? parseInt(enchantMatch[1], 10) : 0;
  return tier + enchant;
}

export function getTierAndEnchant(itemType: string): string {
  if (!itemType) return '';
  const match = itemType.match(/T(\d+)/);
  const tier = match ? parseInt(match[1], 10) : 0;
  const enchantMatch = itemType.match(/@(\d+)/);
  const enchant = enchantMatch ? parseInt(enchantMatch[1], 10) : 0;
  if (tier === 0) return '';
  return enchant > 0 ? `${tier}.${enchant}` : `${tier}.0`;
}
