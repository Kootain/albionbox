import { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Filter, Crosshair, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BattleType, ApplyStatus, AlbionOfficialEvent } from '@albionbox/shared';
import { Button, Input, Modal, Badge } from '@/components/ui';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { BattleDetail } from './battle-report-components/BattleDetail';
import { KillDetailModal } from './battle-report-components/KillDetailModal';

type RegearApply = {
  id: string;
  msgId: string;
  msgUsername?: string | null;
  msgUserid?: string | null;
  msgGuild?: string | null;
  msgChannel?: string | null;
  createTime: string;
  lastStatusTime: string;
  regearId?: string | null;
  regearTicketId?: string | null;
  eventId?: string | null;
  battleId?: string | number | null;
  applyMeta?: string | null;
  status: ApplyStatus;
  victimName?: string | null;
  victimGuild?: string | null;
  applyDetail?: string | null;
};

type SupplementBattle = {
  battleId: string;
  types: BattleType[];
  applies: RegearApply[];
};

const DEFAULT_MSG_GUILD = '1248349507148974';
const LIMIT = 20;

import { useSearchParams } from 'react-router-dom';

export function RegearApprovalTab({
  guildId,
  onRegearPreview,
}: {
  guildId: string;
  onRegearPreview: (battleIds: string[], needApply?: boolean) => void;
}) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const toast = useToast();

  const [view, setView] = useState<'applies' | 'supplement'>('applies');

  const [status, setStatus] = useState<ApplyStatus | ''>('');
  const [channel, setChannel] = useState('');
  const [msgUserID, setMsgUserID] = useState('');
  const [victimName, setVictimName] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<RegearApply[]>([]);

  const [timeFormat, setTimeFormat] = useState<string>('UTC');
  const [channelsMap, setChannelsMap] = useState<Record<string, string>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedDeathRecord, setSelectedDeathRecord] = useState<AlbionOfficialEvent | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const channelBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [supplementLoading, setSupplementLoading] = useState(false);
  const [supplementError, setSupplementError] = useState('');
  const [supplementBattles, setSupplementBattles] = useState<SupplementBattle[]>([]);
  const [detailBattleId, setDetailBattleId] = useState<string | null>(null);
  const [massSaving, setMassSaving] = useState<Record<string, boolean>>({});
  const [deleteSaving, setDeleteSaving] = useState<Record<string, boolean>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  useEffect(() => {
    let mounted = true;
    async function fetchKookData() {
      // Channels
      const settingsRes = await api.guilds[':id'].settings.$get({ param: { id: guildId } });
      const settings = await settingsRes.json();
      const channelsCacheKey = `kook_channels_${guildId}`;
      const cachedChannels = localStorage.getItem(channelsCacheKey);
      if (cachedChannels) {
        setChannelsMap(JSON.parse(cachedChannels));
      } else {
        try {
          
          const res = await (api as any).kook.guilds[':guildId'].channels.$get({ param: { guildId: settings?.kookGuildId } });
          const data = await res.json() as any;
          if (data?.data?.items && Array.isArray(data.data.items)) {
            const map: Record<string, string> = {};
            data.data.items.forEach((c: any) => { map[c.id] = c.name; });
            if (mounted) setChannelsMap(map);
            localStorage.setItem(channelsCacheKey, JSON.stringify(map));
          }
        } catch (e) {
          console.error('Failed to fetch KOOK channels', e);
        }
      }

      // Users
      const usersCacheKey = `kook_users_${guildId}`;
      const cachedUsers = localStorage.getItem(usersCacheKey);
      if (cachedUsers) {
        setUsersMap(JSON.parse(cachedUsers));
      } else {
        try {
          const res = await api.kook.guilds[':guildId'].users.$get({ param: { guildId: settings?.kookGuildId || '' } });
          const data = await res.json() as any;
          if (data?.data?.items && Array.isArray(data.data.items)) {
            const map: Record<string, string> = {};
            data.data.items.forEach((u: any) => { map[u.id] = u.nickname || u.username; });
            if (mounted) setUsersMap(map);
            localStorage.setItem(usersCacheKey, JSON.stringify(map));
          }
        } catch (e) {
          console.error('Failed to fetch KOOK users', e);
        }
      }
    }

    if (guildId) fetchKookData();
    return () => { mounted = false; };
  }, [guildId]);

  useEffect(() => {
    setPage(1);
  }, [status, channel, msgUserID, victimName]);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const offset = (page - 1) * LIMIT;
        
        // Resolve names back to IDs if they match exactly
        const resolveId = (input: string, map: Record<string, string>) => {
          if (!input) return undefined;
          const entry = Object.entries(map).find(([id, name]) => name === input);
          return entry ? entry[0] : input;
        };

        const res = await api.regear_applies.$get({
          query: {
            msgGuild: DEFAULT_MSG_GUILD,
            status: status || undefined,
            msgChannel: resolveId(channel, channelsMap),
            msgUserid: resolveId(msgUserID, usersMap),
            victimName: victimName || undefined,
            limit: String(LIMIT),
            offset: String(offset),
          },
        });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Failed to fetch regear applies'));
        const json = await res.json() as { total: number; items: RegearApply[] };
        if (!mounted) return;
        setTotal(typeof json.total === 'number' ? json.total : 0);
        
        const items = Array.isArray(json.items) ? json.items : [];
        setData(items);

      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? String(e));
        setTotal(0);
        setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, [page, status, channel, msgUserID, victimName]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const sortedSupplementBattles = useMemo(() => {
    const copy = [...supplementBattles];
    copy.sort((a, b) => {
      // Find the earliest createTime in battle a
      const aTimes = a.applies.map(apply => new Date(apply.createTime).getTime()).filter(t => !Number.isNaN(t));
      const aMinTime = aTimes.length > 0 ? Math.min(...aTimes) : 0;
      
      // Find the earliest createTime in battle b
      const bTimes = b.applies.map(apply => new Date(apply.createTime).getTime()).filter(t => !Number.isNaN(t));
      const bMinTime = bTimes.length > 0 ? Math.min(...bTimes) : 0;

      // Sort descending by start time (newest battles first)
      if (aMinTime !== bMinTime) {
        return bMinTime - aMinTime;
      }
      
      // Fallback to battleId sorting
      return Number(b.battleId) - Number(a.battleId);
    });
    return copy;
  }, [supplementBattles]);

  const filteredChannels = useMemo(() => {
    const q = channel.trim().toLowerCase();
    const entries = Object.entries(channelsMap);
    const out = q
      ? entries.filter(([id, name]) => id.toLowerCase().includes(q) || name.toLowerCase().includes(q))
      : entries;
    return out.slice(0, q ? 50 : 20);
  }, [channel, channelsMap]);

  const filteredUsers = useMemo(() => {
    const q = msgUserID.trim().toLowerCase();
    const entries = Object.entries(usersMap);
    const out = q
      ? entries.filter(([id, name]) => id.toLowerCase().includes(q) || name.toLowerCase().includes(q))
      : entries;
    return out.slice(0, q ? 50 : 20);
  }, [msgUserID, usersMap]);

  const loadSupplementCandidates = async () => {
    if (supplementLoading) return;
    setSupplementLoading(true);
    setSupplementError('');
    try {
      const res = await api.regear_applies['supplement-candidates'].$get({
        query: { msgGuild: DEFAULT_MSG_GUILD },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null) as any)?.error ?? 'Failed to fetch supplement candidates');
      const applies = await res.json() as RegearApply[];
      const grouped = new Map<string, RegearApply[]>();
      for (const apply of applies) {
        const battleIdRaw = apply.battleId;
        if (battleIdRaw === null || battleIdRaw === undefined || battleIdRaw === '') continue;
        const battleId = String(battleIdRaw);
        if (!grouped.has(battleId)) grouped.set(battleId, []);
        grouped.get(battleId)!.push(apply);
      }

      const battleIds = [...grouped.keys()].filter(id => Number.isFinite(Number(id)));
      let typesMap = new Map<string, BattleType[]>();
      if (battleIds.length > 0 && guildId) {
        const tagRes = await api.guilds[':id'].battles.$post({
          param: { id: guildId },
          json: { server: 'asia', ids: battleIds.map(id => Number(id)) },
        });
        if (!tagRes.ok) throw new Error((await tagRes.json().catch(() => null) as any)?.error ?? 'Failed to fetch battle tags');
        const records = await tagRes.json() as Array<{ id: number; types: BattleType[] }>;
        typesMap = new Map(records.map(r => [String(r.id), Array.isArray(r.types) ? r.types : []]));
      }

      const battles: SupplementBattle[] = battleIds.map((battleId) => ({
        battleId,
        applies: grouped.get(battleId) ?? [],
        types: typesMap.get(battleId) ?? [],
      }));

      setSupplementBattles(battles);
    } catch (e: any) {
      setSupplementError(e?.message ?? String(e));
      setSupplementBattles([]);
    } finally {
      setSupplementLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'supplement') {
      loadSupplementCandidates();
    }
  }, [view]);

  const updateBattleTypes = async (battleId: string, nextTypes: BattleType[]) => {
    const id = Number(battleId);
    if (!Number.isFinite(id)) return;
    setMassSaving(prev => ({ ...prev, [battleId]: true }));
    try {
      const res = await api.guilds[':id'].battles[':battleId'].$put({
        param: { id: guildId, battleId: String(id) },
        json: { server: 'asia', types: nextTypes },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null) as any)?.error ?? 'Failed to update battle tags');
      setSupplementBattles(prev => prev.map(b => b.battleId === battleId ? { ...b, types: nextTypes } : b));
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally {
      setMassSaving(prev => ({ ...prev, [battleId]: false }));
    }
  };

  const toggleMass = async (battleId: string) => {
    if (massSaving[battleId]) return;
    const battle = supplementBattles.find(b => b.battleId === battleId);
    if (!battle) return;
    const hasMass = battle.types.includes(BattleType.MASS);
    const nextTypes = hasMass ? battle.types.filter(t => t !== BattleType.MASS) : [...battle.types, BattleType.MASS];
    await updateBattleTypes(battleId, nextTypes);
  };

  const deleteApply = async (applyId: string) => {
    if (deleteSaving[applyId]) return;
    setDeleteSaving(prev => ({ ...prev, [applyId]: true }));
    try {
      const res = await api.regear_applies[':id'].$delete({ param: { id: applyId } });
      if (!res.ok) throw new Error((await res.json().catch(() => null) as any)?.error ?? 'Failed to delete apply');

      setSupplementBattles(prev => prev
        .map(b => ({ ...b, applies: b.applies.filter(a => a.id !== applyId) }))
        .filter(b => b.applies.length > 0)
      );
      setData(prev => prev.filter(a => a.id !== applyId));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success(t('guild_dashboard.regear_approval.supplement.deleted', { defaultValue: '已删除' }));
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally {
      setDeleteSaving(prev => ({ ...prev, [applyId]: false }));
    }
  };

  const handleGenerateSupplementTicket = async () => {
    if (supplementLoading) return;
    const battleIds = sortedSupplementBattles.map(b => b.battleId);
    if (battleIds.length === 0) return;

    const hasNonMass = sortedSupplementBattles.some(b => !b.types.includes(BattleType.MASS));
    if (hasNonMass) {
      const ok = await confirm({
        message: t('guild_dashboard.regear_approval.supplement.confirm_non_mass', { defaultValue: '存在未标记为 MASS 的战斗，仍要生成补装工单吗？' }),
      });
      if (!ok) return;
    }

    onRegearPreview(battleIds, true);
  };

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: t('common.all', { defaultValue: 'All' }) },
    { value: ApplyStatus.BINDING, label: t('guild_dashboard.regear_approval.status.binding', { defaultValue: 'binding' }) },
    { value: ApplyStatus.BIND_FAILED, label: t('guild_dashboard.regear_approval.status.bind_failed', { defaultValue: 'bind_failed' }) },
    { value: ApplyStatus.PENDING_AUDIT, label: t('guild_dashboard.regear_approval.status.pending_audit', { defaultValue: 'pending_audit' }) },
    { value: ApplyStatus.PENDING_REGEAR, label: t('guild_dashboard.regear_approval.status.pending_regear', { defaultValue: 'pending_regear' }) },
    { value: ApplyStatus.REJECT, label: t('guild_dashboard.regear_approval.status.reject', { defaultValue: 'reject' }) },
    { value: ApplyStatus.DONE, label: t('guild_dashboard.regear_approval.status.done', { defaultValue: 'done' }) },
  ];

  const getStatusBadge = (s: ApplyStatus) => {
    const cls = {
      [ApplyStatus.BINDING]: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      [ApplyStatus.BIND_FAILED]: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      [ApplyStatus.PENDING_AUDIT]: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      [ApplyStatus.PENDING_REGEAR]: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      [ApplyStatus.REJECT]: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      [ApplyStatus.DONE]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    }[s] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/30';

    return (
      <span className={cn('px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border', cls)}>
        {t(`guild_dashboard.regear_approval.status.${s}`, { defaultValue: s })}
      </span>
    );
  };

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (timeFormat === 'UTC') {
      return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    }
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getBattleTimeRange = (applies: RegearApply[]) => {
    if (!applies || applies.length === 0) return '';
    const times = applies.map(a => new Date(a.createTime).getTime()).filter(t => !Number.isNaN(t));
    if (times.length === 0) return '';
    const minTime = new Date(Math.min(...times));
    const maxTime = new Date(Math.max(...times));
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatPart = (d: Date) => {
      if (timeFormat === 'UTC') return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    
    if (minTime.getTime() === maxTime.getTime()) {
      return formatTime(minTime.toISOString());
    }
    
    // Check if same day
    const isSameDay = timeFormat === 'UTC' 
      ? minTime.getUTCFullYear() === maxTime.getUTCFullYear() && minTime.getUTCMonth() === maxTime.getUTCMonth() && minTime.getUTCDate() === maxTime.getUTCDate()
      : minTime.getFullYear() === maxTime.getFullYear() && minTime.getMonth() === maxTime.getMonth() && minTime.getDate() === maxTime.getDate();
      
    if (isSameDay) {
      return `${formatTime(minTime.toISOString())} - ${formatPart(maxTime)}`;
    }
    return `${formatTime(minTime.toISOString())} - ${formatTime(maxTime.toISOString())}`;
  };

  const handleShowDeathDetails = async (row: RegearApply) => {
    if (!row.eventId) {
      toast.error('Event ID is missing. Cannot fetch battle details.');
      return;
    }
    
    try {
      const res = await api.guilds.test.albion.events[':id'].$get({ 
        param: { id: row.eventId },
        query: { server: 'asia' }
      });
      if (!res.ok) throw new Error('Failed to fetch event data');
      const eventData = await res.json() as AlbionOfficialEvent;
      setSelectedDeathRecord(eventData);
    } catch (e) {
      toast.error('Failed to fetch death details');
    }
  };

  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Filter className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                {t('guild_dashboard.regear_approval.title', { defaultValue: 'Regear Approval' })}
              </h2>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                {t('guild_dashboard.regear_approval.desc', { defaultValue: 'Review regear applies generated from chat messages' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={view === 'applies' ? 'primary' : 'secondary'}
              onClick={() => setView('applies')}
            >
              {t('guild_dashboard.regear_approval.views.applies', { defaultValue: '申请列表' })}
            </Button>
            <Button
              size="sm"
              variant={view === 'supplement' ? 'primary' : 'secondary'}
              onClick={() => setView('supplement')}
            >
              {t('guild_dashboard.regear_approval.views.supplement', { defaultValue: '补装候选' })}
            </Button>

            {view === 'applies' && (
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-black-bg border border-black-border hover:border-gold text-slate-400 hover:text-gold disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 bg-black-bg border border-black-border hover:border-gold text-slate-400 hover:text-gold disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {view === 'applies' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.status', { defaultValue: 'Status' })}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplyStatus | '')}
                className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
              >
                {statusOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.channel', { defaultValue: 'Channel' })}
              </label>
              <div className="relative">
                <input
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setShowChannelSuggestions(true);
                  }}
                  onFocus={() => {
                    if (channelBlurTimeoutRef.current) clearTimeout(channelBlurTimeoutRef.current);
                    setShowChannelSuggestions(true);
                  }}
                  onBlur={() => {
                    channelBlurTimeoutRef.current = setTimeout(() => setShowChannelSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowChannelSuggestions(false);
                  }}
                  className="w-full bg-black-bg border border-black-border rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                  placeholder={t('guild_dashboard.regear_approval.filters.channel', { defaultValue: 'Channel' })}
                />
                {channel && (
                  <button
                    onClick={() => {
                      setChannel('');
                      setShowChannelSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showChannelSuggestions && filteredChannels.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-black-card border border-black-border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {filteredChannels.map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setChannel(name);
                        setShowChannelSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-black-border last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.msg_userid', { defaultValue: 'MsgUserID' })}
              </label>
              <div className="relative">
                <input
                  value={msgUserID}
                  onChange={(e) => {
                    setMsgUserID(e.target.value);
                    setShowUserSuggestions(true);
                  }}
                  onFocus={() => {
                    if (userBlurTimeoutRef.current) clearTimeout(userBlurTimeoutRef.current);
                    setShowUserSuggestions(true);
                  }}
                  onBlur={() => {
                    userBlurTimeoutRef.current = setTimeout(() => setShowUserSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowUserSuggestions(false);
                  }}
                  className="w-full bg-black-bg border border-black-border rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                  placeholder={t('guild_dashboard.regear_approval.filters.msg_userid', { defaultValue: 'MsgUserID' })}
                />
                {msgUserID && (
                  <button
                    onClick={() => {
                      setMsgUserID('');
                      setShowUserSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showUserSuggestions && filteredUsers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-black-card border border-black-border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {filteredUsers.map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setMsgUserID(name);
                        setShowUserSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-black-border last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.victim_name', { defaultValue: 'Victim' })}
              </label>
              <div className="relative">
                <input
                  value={victimName}
                  onChange={(e) => setVictimName(e.target.value)}
                  className="w-full bg-black-bg border border-black-border rounded-xl py-3 pl-4 pr-10 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                  placeholder={t('guild_dashboard.regear_approval.filters.victim_name', { defaultValue: 'Victim' })}
                />
                {victimName && (
                  <button
                    onClick={() => setVictimName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('guild_dashboard.regear_approval.supplement.hint_new', { defaultValue: '拉取所有待审核记录，并按 battleId 聚合' })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleGenerateSupplementTicket}
                disabled={supplementLoading || sortedSupplementBattles.length === 0}
                loading={supplementLoading}
              >
                {t('guild_dashboard.regear_approval.supplement.generate', { defaultValue: '生成补装工单' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      {view === 'applies' ? (
        <div className="overflow-x-auto bg-black-bg border border-black-border rounded-xl">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-black-border bg-black-bg/50">
                <th 
                  className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                  onClick={() => setTimeFormat(timeFormat === 'UTC' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC')}
                >
                  {t('guild_dashboard.regear_approval.table.time', { defaultValue: 'Time' })} ({timeFormat})
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.status', { defaultValue: 'Status' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.victim', { defaultValue: 'Victim' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Map</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.victim_guild', { defaultValue: 'Victim Guild' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.msg_user', { defaultValue: 'Msg User' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.channel', { defaultValue: 'Channel' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.regear_ticket_id', { defaultValue: 'Ticket' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.columns.action', { defaultValue: 'Action' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-border/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    {t('guild_dashboard.regear_approval.states.loading', { defaultValue: 'Loading...' })}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-rose-500">
                    {t('guild_dashboard.regear_approval.states.error', { defaultValue: 'Failed to load regear applies' })}: {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    {t('guild_dashboard.regear_approval.states.empty', { defaultValue: 'No regear applies found' })}
                  </td>
                </tr>
              ) : data.map((row) => {
                let mapName = '-';
                try {
                  if (row.applyDetail) {
                    const detail = JSON.parse(row.applyDetail);
                    mapName = detail.mapName || '-';
                  }
                } catch (e) {}

                return (
                <tr key={row.id} className="hover:bg-black-card/50 transition-colors">
                  <td className="py-4 px-4 text-sm text-slate-300">{formatTime(row.createTime)}</td>
                  <td className="py-4 px-4">{getStatusBadge(row.status)}</td>
                  <td className="py-4 px-4 text-sm text-slate-200 font-bold">{row.victimName || '-'}</td>
                  <td className="py-4 px-4 text-xs text-slate-400">{mapName}</td>
                  <td className="py-4 px-4 text-xs text-slate-400">{row.victimGuild || '-'}</td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-200 font-bold">{row.msgUsername || usersMap[row.msgUserid || ''] || '-'}</span>
                      <span className="text-[10px] text-slate-600 font-mono">{row.msgUserid || '-'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                    {channelsMap[row.msgChannel || ''] || row.msgChannel || '-'}
                  </td>
                  <td className="py-4 px-4">
                    {row.regearTicketId ? (
                      <button
                        onClick={() => {
                          setSearchParams(prev => {
                            prev.set('tab', 'regear');
                            prev.set('ticketId', String(row.regearTicketId));
                            prev.delete('action');
                            return prev;
                          });
                        }}
                        className="flex items-center justify-center p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors"
                        title={t('guild_dashboard.regear_approval.supplement.view_ticket', { defaultValue: '查看工单' })}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleShowDeathDetails(row)}
                        className="p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors inline-flex items-center justify-center"
                        title={t('guild_dashboard.regear_approval.supplement.detail', { defaultValue: '详情' })}
                      >
                        <Crosshair className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (row.applyMeta) {
                            try {
                              const meta = JSON.parse(row.applyMeta);
                              if (meta.imageUrl) {
                                try {
                                  const urlObj = new URL(meta.imageUrl);
                                  const proxyUrl = `https://img.albionbox.com/kook${urlObj.pathname}${urlObj.search}`;
                                  setSelectedImage(proxyUrl);
                                } catch {
                                  setSelectedImage(meta.imageUrl);
                                }
                              } else {
                                toast.error('No image URL found in apply record');
                              }
                            } catch (e) {
                              toast.error('Failed to parse apply meta');
                            }
                          } else {
                            toast.error('No apply record meta available');
                          }
                        }}
                        className="p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors inline-flex items-center justify-center"
                        title={t('guild_dashboard.regear_approval.supplement.image', { defaultValue: '查看申请图片' })}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {supplementLoading ? (
            <div className="py-10 text-center text-slate-500">
              {t('guild_dashboard.regear_approval.states.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : supplementError ? (
            <div className="py-10 text-center text-rose-500">
              {t('guild_dashboard.regear_approval.states.error', { defaultValue: 'Failed to load regear applies' })}: {supplementError}
            </div>
          ) : sortedSupplementBattles.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              {t('guild_dashboard.regear_approval.supplement.empty', { defaultValue: '暂无候选战斗' })}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSupplementBattles.map((battle) => (
                <div key={battle.battleId} className="bg-black-bg border border-black-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-sm font-black text-white flex items-center gap-2">
                        <span>{t('guild_dashboard.regear_approval.supplement.battle', { defaultValue: 'Battle' })} #{battle.battleId}</span>
                        <span className="text-[10px] text-slate-500 bg-black-border/50 px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                          {getBattleTimeRange(battle.applies)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(battle.types.length === 0 ? [t('guild_dashboard.regear_approval.supplement.no_tag', { defaultValue: '无标签' })] : battle.types).map((tag) => (
                          <Badge key={String(tag)} variant={String(tag) === BattleType.MASS ? 'warning' : 'default'}>
                            {String(tag)}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="gold">
                        {t('guild_dashboard.regear_approval.supplement.apply_count', { defaultValue: '{{count}} 条申请', count: battle.applies.length })}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setDetailBattleId(battle.battleId)}>
                        {t('guild_dashboard.regear_approval.supplement.detail', { defaultValue: '详情' })}
                      </Button>
                      <Button
                        size="sm"
                        variant={battle.types.includes(BattleType.MASS) ? 'primary' : 'secondary'}
                        onClick={() => toggleMass(battle.battleId)}
                        loading={massSaving[battle.battleId]}
                      >
                        {battle.types.includes(BattleType.MASS)
                          ? t('guild_dashboard.regear_approval.supplement.unmark_mass', { defaultValue: '取消 MASS' })
                          : t('guild_dashboard.regear_approval.supplement.mark_mass', { defaultValue: '标记 MASS' })
                        }
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {battle.applies.map(apply => (
                      <div key={apply.id} className="flex items-center justify-between gap-3 bg-black-card border border-black-border/60 rounded-xl p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-100 truncate">{apply.victimName || '-'}</span>
                            <span className="text-xs text-slate-500 font-mono truncate">{apply.id}</span>
                            {apply.status && getStatusBadge(apply.status)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="font-mono">{formatTime(apply.createTime)}</span>
                            <span className="truncate">{apply.msgUsername || '-'}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            const ok = await confirm({
                              message: t('guild_dashboard.regear_approval.supplement.confirm_delete_apply', { defaultValue: '确定要删除这条申请吗？' }),
                              danger: true,
                            });
                            if (!ok) return;
                            await deleteApply(apply.id);
                          }}
                          loading={deleteSaving[apply.id]}
                        >
                          {t('common.delete', { defaultValue: '删除' })}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detailBattleId && (
        <Modal
          title={t('guild_dashboard.regear_approval.supplement.detail_modal_title', { defaultValue: '战斗详情' })}
          onClose={() => setDetailBattleId(null)}
          className="max-w-6xl"
        >
          <BattleDetail battleIds={[detailBattleId]} onBack={() => setDetailBattleId(null)} isStandalone />
        </Modal>
      )}

      {selectedDeathRecord && (
        <KillDetailModal record={selectedDeathRecord} onClose={() => setSelectedDeathRecord(null)} />
      )}

      {selectedImage && (
        <Modal
          title={t('guild_dashboard.regear_approval.supplement.image', { defaultValue: '查看申请图片' })}
          onClose={() => setSelectedImage(null)}
          className="max-w-4xl"
        >
          <div className="flex items-center justify-center p-4 bg-black/50 rounded-xl overflow-hidden min-h-[50vh]">
            <img 
              src={selectedImage} 
              alt="Apply Record" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/800x600/1e1e1e/64748b?text=Image+Load+Failed';
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
