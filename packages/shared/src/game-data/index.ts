import type { ItemData, LocalizedText, SpellData } from './types';

// ─── 模块配置 ─────────────────────────────────────────────────────────────────

let _lang: string = 'ZH-CN';

/** 设置默认语言，默认 ZH-CN */
export const setLanguage = (lang: string) => { _lang = lang; };

// ─── 内部缓存 ─────────────────────────────────────────────────────────────────

const itemMap = new Map<number, ItemData>();
const itemUniqueNameMap = new Map<string, ItemData>();
const spellMap = new Map<number, SpellData>();
const weaponTypeMap = new Map<string, string>();

let _loaded = false;

// ─── 加载 ─────────────────────────────────────────────────────────────────────

export const loadGameData = async (): Promise<void> => {
  if (_loaded) return;

  const w = globalThis as any;
  const ossProtocol = typeof w.window !== 'undefined' && w.window.location?.protocol === 'https:' ? 'https' : 'http';
  const ossBase = `${ossProtocol}://albion-resource.oss-cn-shanghai.aliyuncs.com`;

  const [itemsRes, spellsRes] = await Promise.all([
    fetch(`${ossBase}/items.json`),
    fetch(`${ossBase}/spells.json`),
    // fetch(`${_baseUrl}/data/weapon_types.json`),
  ]);

  if (!itemsRes.ok || !spellsRes.ok) {
    throw new Error('游戏数据加载失败，请确认后端服务已启动');
  }

  const [itemsData, spellsData] = await Promise.all([
    itemsRes.json() as Promise<Record<string, unknown>>,
    spellsRes.json() as Promise<Record<string, unknown>>,
  ]);

  Object.values(itemsData).forEach((item: unknown) => {
    const i = item as ItemData;
    itemMap.set(i.Index, i);
    if (i.UniqueName) {
      itemUniqueNameMap.set(i.UniqueName, i);
    }
  });

  Object.values(spellsData).forEach((spell: unknown) => {
    const s = spell as SpellData;
    spellMap.set(s.Index, s);
  });

  _loaded = true;
  console.log(`[game-data] 已加载 ${itemMap.size} 件物品, ${spellMap.size} 个技能, ${weaponTypeMap.size} 种武器类型`);
};

export const isLoaded = () => _loaded;

// ─── 查询 ─────────────────────────────────────────────────────────────────────

export const getItem = (id: number): ItemData | undefined => itemMap.get(id);

export const getItemByUniqueName = (uniqueName: string): ItemData | undefined => itemUniqueNameMap.get(uniqueName);

export const getSpell = (id: number): SpellData | undefined => spellMap.get(id);

export const getWeaponType = (weaponName: string): string | undefined => weaponTypeMap.get(weaponName);

export const getAllItems = (): ItemData[] => Array.from(itemMap.values());

export const getAllSpells = (): SpellData[] => Array.from(spellMap.values());

// ─── 本地化 ───────────────────────────────────────────────────────────────────

/**
 * 获取本地化文本，优先使用 setLanguage 设置的语言，回退到 EN-US
 * 也可以通过第二个参数临时指定语言
 */
export const getLocalizedText = (
  text: LocalizedText | undefined,
  lang?: string,
): string => {
  if (!text) return '';
  const l = lang ?? _lang;
  return text[l] || text['EN-US'] || Object.values(text).find(Boolean) || '';
};

/** 获取物品中文名，找不到时返回 fallback */
export const getItemName = (id: number | undefined, fallback = ''): string => {
  if (id === undefined || id === 0) return fallback;
  const item = itemMap.get(id);
  if (!item) return fallback || `#${id}`;
  return getLocalizedText(item.Name) || item.UniqueName || fallback || `#${id}`;
};

export const getItemNameByUniqueName = (uniqueName: string | undefined, fallback = ''): string => {
  if (!uniqueName) return fallback;
  const item = itemUniqueNameMap.get(uniqueName);
  if (!item) return fallback || uniqueName;
  return getLocalizedText(item.Name) || item.UniqueName || fallback || uniqueName;
};

/** 获取技能中文名，找不到时返回 fallback */
export const getSpellName = (id: number | undefined, fallback = ''): string => {
  if (id === undefined || id < 0) return fallback;
  const spell = spellMap.get(id);
  if (!spell) return fallback || `#${id}`;
  return getLocalizedText(spell.Name) || spell.UniqueName || fallback || `#${id}`;
};
