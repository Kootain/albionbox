// P级 = Tier + 附魔等级（T6_ITEM@2 → P8）
export function calculatePLevel(itemType: string): number {
  const m = itemType.match(/^T(\d+)_[^@]*(?:@(\d+))?/)
  if (!m) return 0
  return parseInt(m[1]) + parseInt(m[2] ?? '0')
}
