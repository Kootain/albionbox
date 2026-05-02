import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui';
import { useConfirm } from '@/components/ui/Confirm';
import { RankingType } from '@albionbox/shared';
import { Trash2 } from 'lucide-react';

type SettlementCycle = {
  id: string;
  guildId: string;
  startDate: string;
  endDate: string;
  rankingIds: string;
  config: string;
  createdAt: string;
  createdByUserId?: string;
};

type SettlementColumn = {
  key: string;
  rewardType: string;
  subType: string;
};

type SettlementAggregatedRow = {
  recipientKey: string;
  username?: string;
  platformId?: string;
  platformType?: string;
  values: Record<string, number>;
  total: number;
  isPaid: boolean;
};

type SettlementDetail = {
  id: string;
  guildId: string;
  settlementId: string;
  recipientKey: string;
  rewardType: string;
  subType: string;
  username?: string;
  platformId?: string;
  platformType?: string;
  coinAmount: number;
  isPaid: boolean;
  paidAt?: string;
  paidByUserId?: string;
  detail: string;
  createdAt: string;
};

type ResourceImportRow = {
  username?: string;
  kookId?: string;
  discordId?: string;
  green: number;
  blue: number;
  purple: number;
  gold: number;
};

function formatCoinAmount(amount: number) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toFixed(2);
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] as string[][] };
  const headers = lines[0].split(',').map(s => s.trim());
  const rows = lines.slice(1).map(line => line.split(',').map(s => s.trim()));
  return { headers, rows };
}

function escapeCsvValue(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

function parseResourceImportCsv(text: string): ResourceImportRow[] {
  const { headers, rows } = parseCsv(text);
  const h = headers.map(normalizeHeader);
  const idx = (name: string) => h.indexOf(name);
  const idxUsername = idx('username');
  const idxKookId = idx('kookid');
  const idxDiscordId = idx('discordid');
  const idxGreen = idx('green');
  const idxBlue = idx('blue');
  const idxPurple = idx('purple');
  const idxGold = idx('gold');

  if ([idxUsername, idxKookId, idxDiscordId, idxGreen, idxBlue, idxPurple, idxGold].some(i => i < 0)) {
    throw new Error('CSV header must be username,kookId,discordId,green,blue,purple,gold');
  }

  const result: ResourceImportRow[] = [];
  for (const cols of rows) {
    const username = cols[idxUsername]?.trim() || undefined;
    const kookId = cols[idxKookId]?.trim() || undefined;
    const discordId = cols[idxDiscordId]?.trim() || undefined;
    if (!username && !kookId && !discordId) continue;
    const green = Number(cols[idxGreen] ?? 0) || 0;
    const blue = Number(cols[idxBlue] ?? 0) || 0;
    const purple = Number(cols[idxPurple] ?? 0) || 0;
    const gold = Number(cols[idxGold] ?? 0) || 0;
    result.push({ username, kookId, discordId, green, blue, purple, gold });
  }
  return result;
}

function rewardTypeLabel(t: (k: string, opt?: any) => string, rewardType: string) {
  if (rewardType === 'MIGHT_REWARD') return t('guild_dashboard.settlements.reward_types.might_reward', { defaultValue: 'Might Reward' });
  if (rewardType === 'MIGHT_TOP_REWARD') return t('guild_dashboard.settlements.reward_types.might_top_reward', { defaultValue: 'Might Top' });
  if (rewardType === 'RESOURCE_REWARD') return t('guild_dashboard.settlements.reward_types.resource_reward', { defaultValue: 'Resource' });
  return rewardType;
}

function rankingTypeLabel(t: (k: string, opt?: any) => string, rankingType: string) {
  const key = `rankings.${String(rankingType).toLowerCase()}`
  return t(key, { defaultValue: rankingType })
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getDetailEffectiveMight(detail: string | undefined) {
  if (!detail) return 0;
  const v = safeJsonParse<any>(detail);
  const n = Number(v?.effectiveMight ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function SettlementsTab({ guildId }: { guildId: string }) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [cycles, setCycles] = useState<SettlementCycle[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);
  const [deleteSaving, setDeleteSaving] = useState<Record<string, boolean>>({});
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [view, setView] = useState<'aggregated' | 'details'>('aggregated');
  const [detailRewardTypeFilter, setDetailRewardTypeFilter] = useState<string>('');
  const [detailSubTypeFilter, setDetailSubTypeFilter] = useState<string>('ALL');

  const [aggregated, setAggregated] = useState<{
    cycle: SettlementCycle;
    columns: SettlementColumn[];
    rows: SettlementAggregatedRow[];
  } | null>(null);

  const [details, setDetails] = useState<{
    cycle: SettlementCycle;
    details: SettlementDetail[];
  } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [mightRewardEnabledTypes, setMightRewardEnabledTypes] = useState<string[]>([]);
  const [mightRewardThreshold, setMightRewardThreshold] = useState<number>(0);
  const [mightRewardRatioByType, setMightRewardRatioByType] = useState<Record<string, number>>({});

  const [mightTopEnabledTypes, setMightTopEnabledTypes] = useState<string[]>([]);
  const [mightTopRanksByType, setMightTopRanksByType] = useState<Record<string, Array<{ rank: number; coinAmount: number }>>>({});

  const [powercoreCoins, setPowercoreCoins] = useState({ green: 0, blue: 0, purple: 0, gold: 0 });
  const [energycrystalCoins, setEnergycrystalCoins] = useState({ green: 0, blue: 0, purple: 0, gold: 0 });
  const [powercoreTable, setPowercoreTable] = useState<ResourceImportRow[]>([]);
  const [energycrystalTable, setEnergycrystalTable] = useState<ResourceImportRow[]>([]);

  const fetchCycles = async () => {
    if (!guildId) return;
    setIsLoadingCycles(true);
    try {
      const res = await api.guilds[':guildId'].settlements.$get({ param: { guildId } });
      if (!res.ok) {
        const data = await res.json() as any;
        error(data?.error ?? 'Failed to load');
        return;
      }
      const data = await res.json() as any;
      setCycles(data.items ?? []);
      if (!selectedSettlementId && data.items?.length) setSelectedSettlementId(data.items[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCycles(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, [guildId]);

  const fetchAggregated = async (settlementId: string) => {
    const res = await api.guilds[':guildId'].settlements[':settlementId'].aggregated.$get({
      param: { guildId, settlementId },
    });
    if (!res.ok) {
      const data = await res.json() as any;
      error(data?.error ?? 'Failed to load');
      return;
    }
    const data = await res.json() as any;
    setAggregated(data);
  };

  const fetchDetails = async (settlementId: string) => {
    const res = await api.guilds[':guildId'].settlements[':settlementId'].details.$get({
      param: { guildId, settlementId },
    });
    if (!res.ok) {
      const data = await res.json() as any;
      error(data?.error ?? 'Failed to load');
      return;
    }
    const data = await res.json() as any;
    setDetails(data);
  };

  useEffect(() => {
    if (!selectedSettlementId) return;
    if (view === 'aggregated') {
      fetchAggregated(selectedSettlementId);
    } else {
      fetchDetails(selectedSettlementId);
    }
  }, [selectedSettlementId, view]);

  const columns = useMemo(() => aggregated?.columns ?? [], [aggregated]);
  const rows = useMemo(() => aggregated?.rows ?? [], [aggregated]);
  const detailRewardTypeOptions = useMemo(() => {
    const list = details?.details ?? [];
    const set = new Set<string>();
    for (const d of list) set.add(d.rewardType);
    return Array.from(set.values()).sort();
  }, [details]);

  const detailSubTypeOptions = useMemo(() => {
    const list = details?.details ?? [];
    const filtered = detailRewardTypeFilter ? list.filter(d => d.rewardType === detailRewardTypeFilter) : list;
    const set = new Set<string>();
    for (const d of filtered) set.add(d.subType);
    return Array.from(set.values()).sort();
  }, [details, detailRewardTypeFilter]);

  useEffect(() => {
    if (detailRewardTypeOptions.length > 0 && (!detailRewardTypeFilter || !detailRewardTypeOptions.includes(detailRewardTypeFilter))) {
      setDetailRewardTypeFilter(detailRewardTypeOptions[0]);
    }
    if (detailSubTypeFilter !== 'ALL' && !detailSubTypeOptions.includes(detailSubTypeFilter)) {
      setDetailSubTypeFilter('ALL');
    }
  }, [detailRewardTypeOptions, detailSubTypeOptions]);

  const filteredDetails = useMemo(() => {
    const list = details?.details ?? [];
    const filtered = list.filter(d => {
      if (detailRewardTypeFilter && d.rewardType !== detailRewardTypeFilter) return false;
      if (detailSubTypeFilter !== 'ALL' && d.subType !== detailSubTypeFilter) return false;
      return true;
    });

    const secondKey = detailRewardTypeFilter === 'RESOURCE_REWARD' ? 'coin' : 'effectiveMight';
    return [...filtered].sort((a, b) => {
      const c1 = String(a.subType ?? '').localeCompare(String(b.subType ?? ''));
      if (c1 !== 0) return c1;

      if (secondKey === 'coin') {
        const diff = (Number(b.coinAmount) || 0) - (Number(a.coinAmount) || 0);
        if (diff !== 0) return diff;
      } else {
        const diff = getDetailEffectiveMight(b.detail) - getDetailEffectiveMight(a.detail);
        if (diff !== 0) return diff;
      }

      const diff3 = (Number(b.coinAmount) || 0) - (Number(a.coinAmount) || 0);
      if (diff3 !== 0) return diff3;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });
  }, [details, detailRewardTypeFilter, detailSubTypeFilter]);

  const onTogglePaid = async (recipientKey: string, isPaid: boolean) => {
    if (!selectedSettlementId) return;
    const res = await api.guilds[':guildId'].settlements[':settlementId'].paid.$put({
      param: { guildId, settlementId: selectedSettlementId },
      json: { recipientKey, isPaid },
    });
    if (!res.ok) {
      const data = await res.json() as any;
      error(data?.error ?? 'Failed');
      return;
    }
    await fetchAggregated(selectedSettlementId);
    if (view === 'details') await fetchDetails(selectedSettlementId);
  };

  const deleteCycle = async (cycle: SettlementCycle) => {
    if (deleteSaving[cycle.id]) return;
    const ok = await confirm.confirm({
      title: t('guild_dashboard.settlements.confirm_delete_title', { defaultValue: 'Delete Settlement' }),
      message: t('guild_dashboard.settlements.confirm_delete_message', {
        defaultValue: 'Delete this settlement cycle and all its details?',
        startDate: cycle.startDate,
        endDate: cycle.endDate,
      }),
      confirmText: t('common.delete', { defaultValue: 'Delete' }),
      cancelText: t('common.cancel', { defaultValue: 'Cancel' }),
      danger: true,
    });
    if (!ok) return;

    setDeleteSaving(prev => ({ ...prev, [cycle.id]: true }));
    try {
      const res = await api.guilds[':guildId'].settlements[':settlementId'].$delete({
        param: { guildId, settlementId: cycle.id },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any;
        error(data?.error ?? 'Failed');
        return;
      }

      setCycles(prev => {
        const next = prev.filter(c => c.id !== cycle.id);
        if (selectedSettlementId === cycle.id) {
          const nextId = next[0]?.id ?? null;
          setSelectedSettlementId(nextId);
          setAggregated(null);
          setDetails(null);
        }
        return next;
      });
      success(t('guild_dashboard.settlements.delete_success', { defaultValue: 'Deleted' }));
    } catch (e: any) {
      console.error(e);
      error(e?.message ?? String(e));
    } finally {
      setDeleteSaving(prev => ({ ...prev, [cycle.id]: false }));
    }
  };

  const toggleType = (list: string[], type: string) => {
    if (list.includes(type)) return list.filter(t => t !== type);
    return [...list, type];
  };

  const ensureMightTopRanks = (type: string, topN: number) => {
    setMightTopRanksByType(prev => {
      const existing = prev[type] ?? [];
      const next = Array.from({ length: topN }).map((_, i) => {
        const rank = i + 1;
        const found = existing.find(x => x.rank === rank);
        return found ?? { rank, coinAmount: 0 };
      });
      return { ...prev, [type]: next };
    });
  };

  const exportSettlementCsv = () => {
    try {
      if (view === 'aggregated') {
        if (!aggregated) return;
        const cols = columns;
        const list = rows;

        const header = [
          t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' }),
          ...cols.map((col) => `${rewardTypeLabel(t as any, col.rewardType)} ${rankingTypeLabel(t as any, col.subType)}`),
          t('guild_dashboard.settlements.table.total', { defaultValue: 'Total' }),
          t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' }),
        ].map(escapeCsvValue).join(',');

        const lines = [
          header,
          ...list.map((r) => {
            const player = r.username ?? (r.platformType && r.platformId ? `${r.platformType}:${r.platformId}` : r.recipientKey);
            const paid = r.isPaid ? '✅' : t('guild_dashboard.settlements.actions.pay', { defaultValue: 'Pay' });
            return [
              player,
              ...cols.map((col) => formatCoinAmount(r.values?.[col.key] ?? 0)),
              formatCoinAmount(r.total),
              paid,
            ].map(escapeCsvValue).join(',');
          }),
        ];

        const cycle = aggregated.cycle;
        const fileName = `settlement_${cycle.startDate}_${cycle.endDate}_aggregated.csv`;
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        success(t('common.export_csv', { defaultValue: 'Export CSV' }));
        return;
      }

      if (!details) return;
      const list = filteredDetails;
      const isResource = detailRewardTypeFilter === 'RESOURCE_REWARD';
      const isMightTop = detailRewardTypeFilter === 'MIGHT_TOP_REWARD';
      const isMight = detailRewardTypeFilter === 'MIGHT_REWARD';

      const headerParts: string[] = [];
      if (isResource) {
        headerParts.push(
          t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' }),
          t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' }),
        );
        headerParts.push(
          t('guild_dashboard.settlements.table.green', { defaultValue: 'Green' }),
          t('guild_dashboard.settlements.table.blue', { defaultValue: 'Blue' }),
          t('guild_dashboard.settlements.table.purple', { defaultValue: 'Purple' }),
          t('guild_dashboard.settlements.table.gold', { defaultValue: 'Gold' }),
        );
      }
      if (isMightTop) {
        headerParts.push(
          t('guild_dashboard.settlements.table.rank', { defaultValue: 'Rank' }),
          t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' }),
          t('guild_dashboard.settlements.table.cycle_might', { defaultValue: 'Cycle Might' }),
          t('guild_dashboard.settlements.table.total_might', { defaultValue: 'Total Might' }),
          t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' }),
          t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' }),
          t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' }),
        );
      } else if (isMight) {
        headerParts.push(
          t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' }),
          t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' }),
          t('guild_dashboard.settlements.table.cycle_might', { defaultValue: 'Cycle Might' }),
          t('guild_dashboard.settlements.table.total_might', { defaultValue: 'Total Might' }),
          t('guild_dashboard.settlements.table.qualified', { defaultValue: 'Qualified' }),
          t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' }),
          t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' }),
        );
      } else if (isResource) {
        headerParts.push(
          t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' }),
          t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' }),
        );
      } else {
        headerParts.push(
          t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' }),
          t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' }),
          t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' }),
          t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' }),
        );
      }

      const header = headerParts.map(escapeCsvValue).join(',');

      const lines = [
        header,
        ...list.map((d) => {
          const v = d.detail ? safeJsonParse<any>(d.detail) : null;
          const player = d.username ?? (d.platformType && d.platformId ? `${d.platformType}:${d.platformId}` : d.recipientKey);
          if (isResource) {
            const parts: any[] = [
              player,
              rankingTypeLabel(t as any, d.subType),
            ];
            const counts = v?.counts ?? {};
            parts.push(counts.green ?? 0, counts.blue ?? 0, counts.purple ?? 0, counts.gold ?? 0);
            parts.push(formatCoinAmount(d.coinAmount), d.isPaid ? '✅' : '');
            return parts.map(escapeCsvValue).join(',');
          }
          if (isMightTop) {
            const parts: any[] = [
              v?.rank ? `#${v.rank}` : '-',
              player,
              v?.effectiveMight ?? '-',
              v?.snapshotMight ?? v?.totalMight ?? '-',
              formatCoinAmount(d.coinAmount),
              rankingTypeLabel(t as any, d.subType),
              d.isPaid ? '✅' : '',
            ];
            return parts.map(escapeCsvValue).join(',');
          }
          if (isMight) {
            const parts: any[] = [
              player,
              rankingTypeLabel(t as any, d.subType),
              v?.effectiveMight ?? '-',
              v?.totalMight ?? '-',
              v?.overThreshold ? t('common.yes', { defaultValue: 'Yes' }) : t('common.no', { defaultValue: 'No' }),
              formatCoinAmount(d.coinAmount),
              d.isPaid ? '✅' : '',
            ];
            return parts.map(escapeCsvValue).join(',');
          }

          const parts: any[] = [player, rankingTypeLabel(t as any, d.subType), formatCoinAmount(d.coinAmount), d.isPaid ? '✅' : ''];
          return parts.map(escapeCsvValue).join(',');
        }),
      ];

      const cycle = details.cycle;
      const fileName = `settlement_${cycle.startDate}_${cycle.endDate}_details.csv`;
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      success(t('common.export_csv', { defaultValue: 'Export CSV' }));
    } catch (e: any) {
      console.error(e);
      error(e?.message ?? 'Failed');
    }
  };

  useEffect(() => {
    if (!isCreateOpen) return;
    let aborted = false;
    const run = async () => {
      try {
        const res = await ((api as any).guilds as any)[':id'].settings.$get({ param: { id: guildId } });
        if (!res.ok) return;
        const data = await res.json().catch(() => null) as any;
        if (aborted) return;
        const preset = data?.settlementPreset;
        if (!preset) return;

        if (preset.mightReward?.enabledTypes) setMightRewardEnabledTypes(preset.mightReward.enabledTypes);
        if (preset.mightReward?.threshold !== undefined) setMightRewardThreshold(Number(preset.mightReward.threshold) || 0);
        if (preset.mightReward?.ratioByType) setMightRewardRatioByType(preset.mightReward.ratioByType);

        if (preset.mightTopReward?.enabledTypes) setMightTopEnabledTypes(preset.mightTopReward.enabledTypes);
        if (preset.mightTopReward?.topConfigByType) {
          const next: Record<string, Array<{ rank: number; coinAmount: number }>> = {};
          for (const type of preset.mightTopReward.enabledTypes ?? []) {
            const rewards = preset.mightTopReward.topConfigByType?.[type]?.rewards;
            next[type] = Array.isArray(rewards) ? rewards : [];
          }
          setMightTopRanksByType(next);
          for (const type of preset.mightTopReward.enabledTypes ?? []) {
            const n = (next[type] ?? []).length || 3;
            ensureMightTopRanks(type, n);
          }
        }

        if (preset.resourceReward?.powercore?.coinPerUnitByColor) setPowercoreCoins(preset.resourceReward.powercore.coinPerUnitByColor);
        if (preset.resourceReward?.energycrystal?.coinPerUnitByColor) setEnergycrystalCoins(preset.resourceReward.energycrystal.coinPerUnitByColor);
      } catch (e) {
        console.error(e);
      }
    };
    run();
    return () => {
      aborted = true;
    };
  }, [isCreateOpen, guildId]);

  const onImportFile = async (file: File, kind: 'powercore' | 'energycrystal') => {
    const text = await file.text();
    const parsed = parseResourceImportCsv(text);
    const setTable = kind === 'powercore' ? setPowercoreTable : setEnergycrystalTable;

    const shouldFill = parsed.some(r => !r.username && r.kookId);
    if (!shouldFill) {
      setTable(parsed);
      return;
    }

    try {
      const res = await ((api as any).guilds as any)[':id'].provider_bindings.$get({
        param: { id: guildId },
        query: { provider: 'kook' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any;
        error(data?.error ?? 'Failed to load provider bindings');
        setTable(parsed);
        return;
      }

      const data = await res.json().catch(() => null) as any;
      const items = data?.items ?? [];
      const providerIdToUsername: Record<string, string> = {};
      for (const item of items) {
        const providerId = String(item?.providerId ?? '').trim();
        const username = String(item?.gameAccountUsername ?? '').trim();
        if (providerId && username) providerIdToUsername[providerId] = username;
      }

      const filled = parsed.map((r) => {
        if (r.username) return r;
        const kookId = r.kookId?.trim();
        if (!kookId) return r;
        const username = providerIdToUsername[kookId];
        if (!username) return r;
        return { ...r, username };
      });

      setTable(filled);
    } catch (e: any) {
      error(e?.message ?? 'Failed to load provider bindings');
      setTable(parsed);
    }
  };

  const onCreate = async () => {
    if (!guildId) return;
    try {
      const topConfigByType: Record<string, { rewards: Array<{ rank: number; coinAmount: number }> }> = {};
      for (const type of mightTopEnabledTypes) {
        topConfigByType[type] = { rewards: (mightTopRanksByType[type] ?? []).filter(r => r.coinAmount >= 0) };
      }

      const ratioByType: Record<string, number> = {};
      for (const type of mightRewardEnabledTypes) {
        ratioByType[type] = Number(mightRewardRatioByType[type] ?? 0) || 0;
      }

      const config = {
        version: 'v1' as const,
        mightReward: {
          enabledTypes: mightRewardEnabledTypes as any[],
          threshold: mightRewardThreshold,
          ratioByType,
          effectivePolicy: 'ZERO_BELOW_THRESHOLD' as const,
        },
        mightTopReward: {
          enabledTypes: mightTopEnabledTypes as any[],
          topConfigByType,
        },
        resourceReward: {
          powercore: { coinPerUnitByColor: powercoreCoins },
          energycrystal: { coinPerUnitByColor: energycrystalCoins },
          imports: {
            powercoreTable,
            energycrystalTable,
          },
        },
      };

      const res = await api.guilds[':guildId'].settlements.$post({
        param: { guildId },
        json: { guildId, startDate, endDate, config } as any,
      });

      if (!res.ok) {
        const data = await res.json() as any;
        error(data?.error ?? 'Failed');
        return;
      }
      const data = await res.json() as any;
      success(t('guild_dashboard.settlements.create_success', { defaultValue: 'Settlement created' }));
      setIsCreateOpen(false);
      await fetchCycles();
      setSelectedSettlementId(data.id);
      setView('aggregated');
    } catch (e) {
      console.error(e);
      error('Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">
            {t('guild_dashboard.settlements.title', { defaultValue: 'Settlements' })}
          </h2>
          <p className="text-sm text-slate-400">
            {t('guild_dashboard.settlements.desc', { defaultValue: 'Create and review settlement cycles' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSettlementCsv}
            disabled={!selectedSettlementId}
            className="bg-black-bg text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black-border transition-colors disabled:opacity-50"
          >
            {t('common.export_csv', { defaultValue: 'Export CSV' })}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gold text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-gold/90 transition-colors"
          >
            {t('guild_dashboard.settlements.create', { defaultValue: 'Create' })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-1 bg-black-card border border-black-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-black-border text-sm font-bold text-white uppercase tracking-widest">
            {t('guild_dashboard.settlements.cycles', { defaultValue: 'Cycles' })}
          </div>
          <div className="p-2 max-h-[520px] overflow-y-auto custom-scrollbar">
            {isLoadingCycles ? (
              <div className="p-4 text-slate-400 text-sm">{t('common.loading', { defaultValue: 'Loading...' })}</div>
            ) : (
              <div className="space-y-2">
                {cycles.map(cycle => (
                  <div
                    key={cycle.id}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      selectedSettlementId === cycle.id
                        ? 'border-gold bg-gold/10 text-white'
                        : 'border-black-border hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => setSelectedSettlementId(cycle.id)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-bold">{cycle.startDate} ~ {cycle.endDate}</div>
                        <div className="text-xs text-slate-500 mt-1">{cycle.createdAt}</div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCycle(cycle);
                        }}
                        disabled={Boolean(deleteSaving[cycle.id])}
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-50 transition-colors p-1"
                        title={t('common.delete', { defaultValue: 'Delete' })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {cycles.length === 0 && (
                  <div className="p-4 text-slate-500 text-sm">
                    {t('guild_dashboard.settlements.empty', { defaultValue: 'No cycles yet' })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-black-card border border-black-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-black-border flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setView('aggregated')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                  view === 'aggregated' ? 'bg-gold/10 text-gold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('guild_dashboard.settlements.views.aggregated', { defaultValue: 'By Player' })}
              </button>
              <button
                onClick={() => setView('details')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                  view === 'details' ? 'bg-gold/10 text-gold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('guild_dashboard.settlements.views.details', { defaultValue: 'Details' })}
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            {view === 'aggregated' && aggregated && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left py-2 pr-3 font-bold uppercase tracking-widest">
                      {t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' })}
                    </th>
                    {columns.map(col => (
                      <th key={col.key} className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                        {rewardTypeLabel(t as any, col.rewardType)} {rankingTypeLabel(t as any, col.subType)}
                      </th>
                    ))}
                    <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                      {t('guild_dashboard.settlements.table.total', { defaultValue: 'Total' })}
                    </th>
                    <th className="text-center py-2 pl-3 font-bold uppercase tracking-widest">
                      {t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.recipientKey} className="border-t border-black-border">
                      <td className="py-2 pr-3 text-white font-bold">
                        <div className="truncate max-w-[240px]" title={r.username ?? r.platformId ?? r.recipientKey}>
                          {r.username ?? (r.platformType && r.platformId ? `${r.platformType}:${r.platformId}` : r.recipientKey)}
                        </div>
                      </td>
                      {columns.map(col => (
                        <td key={col.key} className="py-2 px-3 text-right text-slate-200 font-mono">
                          {formatCoinAmount(r.values[col.key] ?? 0)}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right text-gold font-mono font-bold">
                        {formatCoinAmount(r.total)}
                      </td>
                      <td className="py-2 pl-3 text-center">
                        {r.isPaid ? (
                          <button
                            className="px-3 py-1 rounded-lg bg-emerald-900/30 text-emerald-400 font-bold"
                            onClick={() => onTogglePaid(r.recipientKey, false)}
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1 rounded-lg bg-gold text-black font-bold hover:bg-gold/90"
                            onClick={() => onTogglePaid(r.recipientKey, true)}
                          >
                            {t('guild_dashboard.settlements.actions.pay', { defaultValue: 'Pay' })}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="py-6 text-slate-500 text-center" colSpan={columns.length + 3}>
                        {t('guild_dashboard.settlements.empty_result', { defaultValue: 'No results' })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {view === 'details' && details && (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">
                      {t('guild_dashboard.settlements.filters.reward_type', { defaultValue: 'Reward Type' })}
                    </label>
                    <select
                      value={detailRewardTypeFilter}
                      onChange={(e) => {
                        setDetailRewardTypeFilter(e.target.value);
                        setDetailSubTypeFilter('ALL');
                      }}
                      className="bg-black-bg border border-black-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                    >
                      {detailRewardTypeOptions.map((rt) => (
                        <option key={rt} value={rt}>{rewardTypeLabel(t as any, rt)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">
                      {t('guild_dashboard.settlements.filters.sub_type', { defaultValue: 'Sub Type' })}
                    </label>
                    <select
                      value={detailSubTypeFilter}
                      onChange={(e) => setDetailSubTypeFilter(e.target.value)}
                      className="bg-black-bg border border-black-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                    >
                      <option value="ALL">{t('common.all', { defaultValue: 'All' })}</option>
                      {detailSubTypeOptions.map((st) => (
                        <option key={st} value={st}>{rankingTypeLabel(t as any, st)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500">
                    {detailRewardTypeFilter === 'MIGHT_TOP_REWARD' ? (
                      <>
                        <th className="text-center py-2 px-2 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.rank', { defaultValue: 'Rank' })}
                        </th>
                        <th className="text-left py-2 pr-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' })}
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="text-left py-2 pr-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.player', { defaultValue: 'Player' })}
                        </th>
                        <th className="text-left py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' })}
                        </th>
                      </>
                    )}
                    {detailRewardTypeFilter === 'RESOURCE_REWARD' && (
                      <>
                        <th className="text-center py-2 px-2 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.green', { defaultValue: 'Green' })}
                        </th>
                        <th className="text-center py-2 px-2 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.blue', { defaultValue: 'Blue' })}
                        </th>
                        <th className="text-center py-2 px-2 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.purple', { defaultValue: 'Purple' })}
                        </th>
                        <th className="text-center py-2 px-2 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.gold', { defaultValue: 'Gold' })}
                        </th>
                      </>
                    )}
                    {detailRewardTypeFilter === 'MIGHT_TOP_REWARD' && (
                      <>
                        <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.cycle_might', { defaultValue: 'Cycle Might' })}
                        </th>
                        <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.total_might', { defaultValue: 'Total Might' })}
                        </th>
                        <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' })}
                        </th>
                        <th className="text-left py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.subtype', { defaultValue: 'SubType' })}
                        </th>
                      </>
                    )}
                    {detailRewardTypeFilter === 'MIGHT_REWARD' && (
                      <>
                        <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.cycle_might', { defaultValue: 'Cycle Might' })}
                        </th>
                        <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.total_might', { defaultValue: 'Total Might' })}
                        </th>
                        <th className="text-center py-2 px-3 font-bold uppercase tracking-widest">
                          {t('guild_dashboard.settlements.table.qualified', { defaultValue: 'Qualified' })}
                        </th>
                      </>
                    )}
                    {detailRewardTypeFilter !== 'MIGHT_TOP_REWARD' && (
                      <th className="text-right py-2 px-3 font-bold uppercase tracking-widest">
                        {t('guild_dashboard.settlements.table.amount', { defaultValue: 'Amount' })}
                      </th>
                    )}
                    <th className="text-center py-2 pl-3 font-bold uppercase tracking-widest">
                      {t('guild_dashboard.settlements.table.paid', { defaultValue: 'Paid' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.map(d => (
                    <tr key={d.id} className="border-t border-black-border">
                      {(() => {
                        const v = d.detail ? safeJsonParse<any>(d.detail) : null;
                        const isResource = detailRewardTypeFilter === 'RESOURCE_REWARD';
                        const isMightTop = detailRewardTypeFilter === 'MIGHT_TOP_REWARD';
                        const isMight = detailRewardTypeFilter === 'MIGHT_REWARD';
                        const counts = isResource ? (v?.counts ?? {}) : {};

                        return (
                          <>
                      {isMightTop && (
                        <td className="py-2 px-2 text-center text-slate-200 font-mono">{v?.rank ? `#${v.rank}` : '-'}</td>
                      )}
                      <td className="py-2 pr-3 text-white font-bold">
                        <div className="truncate max-w-[240px]" title={d.username ?? d.platformId ?? d.recipientKey}>
                          {d.username ?? (d.platformType && d.platformId ? `${d.platformType}:${d.platformId}` : d.recipientKey)}
                        </div>
                      </td>
                      {!isMightTop && (
                        <td className="py-2 px-3 text-slate-200">{rankingTypeLabel(t as any, d.subType)}</td>
                      )}
                      {isResource && (
                        <>
                          <td className="py-2 px-2 text-center text-slate-200 font-mono">{counts.green ?? 0}</td>
                          <td className="py-2 px-2 text-center text-slate-200 font-mono">{counts.blue ?? 0}</td>
                          <td className="py-2 px-2 text-center text-slate-200 font-mono">{counts.purple ?? 0}</td>
                          <td className="py-2 px-2 text-center text-slate-200 font-mono">{counts.gold ?? 0}</td>
                        </>
                      )}
                      {isMightTop && (
                        <>
                          <td className="py-2 px-3 text-right text-slate-200 font-mono">{v?.effectiveMight ?? '-'}</td>
                          <td className="py-2 px-3 text-right text-slate-200 font-mono">{v?.snapshotMight ?? v?.totalMight ?? '-'}</td>
                          <td className="py-2 px-3 text-right text-gold font-mono font-bold">{formatCoinAmount(d.coinAmount)}</td>
                          <td className="py-2 px-3 text-slate-200">{rankingTypeLabel(t as any, d.subType)}</td>
                        </>
                      )}
                      {isMight && (
                        <>
                          <td className="py-2 px-3 text-right text-slate-200 font-mono">{v?.effectiveMight ?? '-'}</td>
                          <td className="py-2 px-3 text-right text-slate-200 font-mono">{v?.totalMight ?? '-'}</td>
                          <td className="py-2 px-3 text-center text-slate-200 font-mono">
                            {v?.overThreshold ? t('common.yes', { defaultValue: 'Yes' }) : t('common.no', { defaultValue: 'No' })}
                          </td>
                        </>
                      )}
                      {!isMightTop && (
                        <td className="py-2 px-3 text-right text-gold font-mono font-bold">{formatCoinAmount(d.coinAmount)}</td>
                      )}
                      <td className="py-2 pl-3 text-center">{d.isPaid ? '✅' : ''}</td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                  {filteredDetails.length === 0 && (
                    <tr>
                      <td
                        className="py-6 text-slate-500 text-center"
                        colSpan={detailRewardTypeFilter === 'RESOURCE_REWARD' ? 8 : detailRewardTypeFilter === 'MIGHT_TOP_REWARD' ? 7 : detailRewardTypeFilter === 'MIGHT_REWARD' ? 7 : 4}
                      >
                        {t('guild_dashboard.settlements.empty_result', { defaultValue: 'No results' })}
                      </td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <Modal
          title={t('guild_dashboard.settlements.create_title', { defaultValue: 'Create Settlement' })}
          onClose={() => setIsCreateOpen(false)}
          className="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.start_date', { defaultValue: 'Start Date' })}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black-bg border border-black-border rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold transition-colors text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.end_date', { defaultValue: 'End Date' })}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black-bg border border-black-border rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold transition-colors text-sm"
                />
              </div>
            </div>

            <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
              <div className="text-sm font-bold text-white uppercase tracking-widest">
                {t('guild_dashboard.settlements.form.might_reward', { defaultValue: 'Might Reward' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.threshold', { defaultValue: 'Threshold' })}</label>
                  <input
                    type="number"
                    value={mightRewardThreshold}
                    onChange={(e) => setMightRewardThreshold(Number(e.target.value))}
                    className="w-full bg-black-card border border-black-border rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold transition-colors text-sm font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.enabled_types', { defaultValue: 'Enabled Types' })}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.values(RankingType).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setMightRewardEnabledTypes(prev => {
                          const next = toggleType(prev, type);
                          setMightRewardRatioByType((ratioPrev) => {
                            if (next.includes(type)) {
                              if (ratioPrev[type] === undefined) return { ...ratioPrev, [type]: 0 };
                              return ratioPrev;
                            }
                            const { [type]: _, ...rest } = ratioPrev;
                            return rest;
                          });
                          return next;
                        });
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${
                        mightRewardEnabledTypes.includes(type) ? 'border-gold bg-gold/10 text-gold' : 'border-black-border text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {rankingTypeLabel(t as any, type)}
                    </button>
                  ))}
                </div>
              </div>

              {mightRewardEnabledTypes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.ratio_by_type', { defaultValue: 'Ratio by Type' })}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {mightRewardEnabledTypes.map((type) => (
                      <div key={type} className="flex items-center justify-between gap-3 bg-black-card border border-black-border rounded-lg px-3 py-2">
                        <div className="text-xs font-bold text-slate-300">{rankingTypeLabel(t as any, type)}</div>
                        <input
                          type="number"
                          value={mightRewardRatioByType[type] ?? 0}
                          min={0}
                          onChange={(e) => setMightRewardRatioByType(prev => ({ ...prev, [type]: Number(e.target.value) }))}
                          className="w-32 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
              <div className="text-sm font-bold text-white uppercase tracking-widest">
                {t('guild_dashboard.settlements.form.might_top', { defaultValue: 'Might TOP Reward' })}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.enabled_types', { defaultValue: 'Enabled Types' })}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.values(RankingType).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setMightTopEnabledTypes(prev => toggleType(prev, type));
                        setTimeout(() => ensureMightTopRanks(type, 3), 0);
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${
                        mightTopEnabledTypes.includes(type) ? 'border-gold bg-gold/10 text-gold' : 'border-black-border text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {rankingTypeLabel(t as any, type)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {mightTopEnabledTypes.map(type => (
                  <div key={type} className="border border-black-border rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">{rankingTypeLabel(t as any, type)}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{t('guild_dashboard.settlements.form.top_n', { defaultValue: 'Top N' })}</span>
                        <input
                          type="number"
                          value={(mightTopRanksByType[type] ?? []).length || 3}
                          min={1}
                          max={50}
                          onChange={(e) => ensureMightTopRanks(type, Math.max(1, Number(e.target.value) || 1))}
                          className="w-20 bg-black-card border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {(mightTopRanksByType[type] ?? []).map(r => (
                        <div key={r.rank} className="flex items-center justify-between gap-2 bg-black-card border border-black-border rounded-lg px-3 py-2">
                          <div className="text-xs font-bold text-slate-300">#{r.rank}</div>
                          <input
                            type="number"
                            value={r.coinAmount}
                            min={0}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setMightTopRanksByType(prev => ({
                                ...prev,
                                [type]: (prev[type] ?? []).map(x => x.rank === r.rank ? { ...x, coinAmount: value } : x),
                              }));
                            }}
                            className="w-28 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
              <div className="text-sm font-bold text-white uppercase tracking-widest">
                {t('guild_dashboard.settlements.form.resource_reward', { defaultValue: 'Resource Reward' })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 border border-black-border rounded-xl p-3">
                  <div className="text-sm font-bold text-white">{t('guild_dashboard.settlements.form.powercore', { defaultValue: 'Powercore' })}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['green', 'blue', 'purple', 'gold'] as const).map(color => (
                      <div key={color} className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">{color}</label>
                        <input
                          type="number"
                          value={(powercoreCoins as any)[color]}
                          onChange={(e) => setPowercoreCoins(prev => ({ ...prev, [color]: Number(e.target.value) }))}
                          className="w-full bg-black-card border border-black-border rounded-lg px-3 py-2 text-white text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">{t('guild_dashboard.settlements.form.import_csv', { defaultValue: 'Import CSV' })}</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImportFile(f, 'powercore').catch((err) => error(String(err?.message ?? err)));
                      }}
                      className="w-full text-xs text-slate-300"
                    />
                    <div className="text-xs text-slate-500">{t('guild_dashboard.settlements.form.import_rows', { defaultValue: 'Rows' })}: {powercoreTable.length}</div>
                  </div>
                </div>

                <div className="space-y-3 border border-black-border rounded-xl p-3">
                  <div className="text-sm font-bold text-white">{t('guild_dashboard.settlements.form.energycrystal', { defaultValue: 'Energy Crystal' })}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['green', 'blue', 'purple', 'gold'] as const).map(color => (
                      <div key={color} className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">{color}</label>
                        <input
                          type="number"
                          value={(energycrystalCoins as any)[color]}
                          onChange={(e) => setEnergycrystalCoins(prev => ({ ...prev, [color]: Number(e.target.value) }))}
                          className="w-full bg-black-card border border-black-border rounded-lg px-3 py-2 text-white text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">{t('guild_dashboard.settlements.form.import_csv', { defaultValue: 'Import CSV' })}</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImportFile(f, 'energycrystal').catch((err) => error(String(err?.message ?? err)));
                      }}
                      className="w-full text-xs text-slate-300"
                    />
                    <div className="text-xs text-slate-500">{t('guild_dashboard.settlements.form.import_rows', { defaultValue: 'Rows' })}: {energycrystalTable.length}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {t('guild_dashboard.settlements.form.csv_hint', { defaultValue: 'CSV header: username,kookId,discordId,green,blue,purple,gold' })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-black-border text-slate-300 font-bold hover:border-slate-600"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={onCreate}
                className="px-4 py-2 rounded-xl bg-gold text-black font-bold hover:bg-gold/90"
              >
                {t('common.create', { defaultValue: 'Create' })}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
