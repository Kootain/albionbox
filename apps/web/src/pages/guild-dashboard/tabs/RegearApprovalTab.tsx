import { useEffect, useMemo, useState, useRef } from 'react';
import { Filter, Crosshair, Image as ImageIcon, X, Link as LinkIcon, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BattleType, ApplyStatus, AlbionOfficialEvent } from '@albionbox/shared';
import { Button, Modal, Badge } from '@/components/ui';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { BattleDetail } from './battle-report-components/BattleDetail';
import { KillDetailModal } from './battle-report-components/KillDetailModal';
import { useSearchParams } from 'react-router-dom';
import { RegearApplyRow } from './regear-components/RegearApplyRow';

export type RegearApply = {
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

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
    { value: ApplyStatus.BINDING, label: t('guild_dashboard.regear_approval.status.binding', { defaultValue: 'binding' }) },
    { value: ApplyStatus.BIND_FAILED, label: t('guild_dashboard.regear_approval.status.bind_failed', { defaultValue: 'bind_failed' }) },
    { value: ApplyStatus.PENDING_AUDIT, label: t('guild_dashboard.regear_approval.status.pending_audit', { defaultValue: 'pending_audit' }) },
    { value: ApplyStatus.PENDING_REGEAR, label: t('guild_dashboard.regear_approval.status.pending_regear', { defaultValue: 'pending_regear' }) },
    { value: ApplyStatus.REJECT, label: t('guild_dashboard.regear_approval.status.reject', { defaultValue: 'reject' }) },
    { value: ApplyStatus.DONE, label: t('guild_dashboard.regear_approval.status.done', { defaultValue: 'done' }) },
  ];

  const [status, setStatus] = useState<ApplyStatus[]>(statusOptions.filter(o => o.value !== 'all').map(o => o.value as ApplyStatus));
  const [channel, setChannel] = useState('');
  const [msgUserID, setMsgUserID] = useState('');
  const [victimName, setVictimName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [battles, setBattles] = useState<SupplementBattle[]>([]);

  const [timeFormat, setTimeFormat] = useState<string>('UTC');
  const [channelsMap, setChannelsMap] = useState<Record<string, string>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedDeathRecord, setSelectedDeathRecord] = useState<AlbionOfficialEvent | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const channelBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detailBattleId, setDetailBattleId] = useState<string | null>(null);
  const [massSaving, setMassSaving] = useState<Record<string, boolean>>({});
  const [deleteSaving, setDeleteSaving] = useState<Record<string, boolean>>({});
  const [groupByBattle, setGroupByBattle] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchKookData() {
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
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const resolveId = (input: string, map: Record<string, string>) => {
          if (!input) return undefined;
          const entry = Object.entries(map).find(([id, name]) => name === input);
          return entry ? entry[0] : input;
        };

        const res = await api.regear_applies.$get({
          query: {
            msgGuild: DEFAULT_MSG_GUILD,
            msgChannel: resolveId(channel, channelsMap),
            msgUserid: resolveId(msgUserID, usersMap),
            victimName: victimName || undefined,
            limit: '1000',
          },
        });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Failed to fetch regear applies'));
        const json = await res.json() as any;
        if (!mounted) return;
        
        const items: RegearApply[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);

        const grouped = new Map<string, RegearApply[]>();
        for (const apply of items) {
          const battleIdRaw = apply.battleId;
          const battleId = (battleIdRaw === null || battleIdRaw === undefined || battleIdRaw === '') ? 'unknown' : String(battleIdRaw);
          if (!grouped.has(battleId)) grouped.set(battleId, []);
          grouped.get(battleId)!.push(apply);
        }

        const validBattleIds = [...grouped.keys()].filter(id => id !== 'unknown' && Number.isFinite(Number(id)));
        let typesMap = new Map<string, BattleType[]>();
        if (validBattleIds.length > 0 && guildId) {
          const tagRes = await api.guilds[':id'].battles.$post({
            param: { id: guildId },
            json: { server: 'asia', ids: validBattleIds.map(id => Number(id)) },
          });
          if (tagRes.ok) {
            const records = await tagRes.json() as Array<{ id: number; types: BattleType[] }>;
            typesMap = new Map(records.map(r => [String(r.id), Array.isArray(r.types) ? r.types : []]));
          }
        }

        const newBattles: SupplementBattle[] = [...grouped.keys()].map((battleId) => ({
          battleId,
          applies: grouped.get(battleId) ?? [],
          types: typesMap.get(battleId) ?? [],
        }));

        setBattles(newBattles);

      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? String(e));
        setBattles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, msgUserID, victimName]);

  const sortedBattles = useMemo(() => {
    const copy = battles.map(b => {
      const filteredApplies = status.length > 0 
        ? b.applies.filter(a => status.includes(a.status))
        : b.applies;
      return { ...b, applies: filteredApplies };
    }).filter(b => b.applies.length > 0);

    copy.sort((a, b) => {
      if (a.battleId === 'unknown') return 1;
      if (b.battleId === 'unknown') return -1;

      const aTimes = a.applies.map(apply => new Date(apply.createTime).getTime()).filter(t => !Number.isNaN(t));
      const aMinTime = aTimes.length > 0 ? Math.min(...aTimes) : 0;
      
      const bTimes = b.applies.map(apply => new Date(apply.createTime).getTime()).filter(t => !Number.isNaN(t));
      const bMinTime = bTimes.length > 0 ? Math.min(...bTimes) : 0;

      if (aMinTime !== bMinTime) {
        return bMinTime - aMinTime;
      }
      
      return Number(b.battleId) - Number(a.battleId);
    });
    return copy;
  }, [battles, status]);

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
      setBattles(prev => prev.map(b => b.battleId === battleId ? { ...b, types: nextTypes } : b));
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally {
      setMassSaving(prev => ({ ...prev, [battleId]: false }));
    }
  };

  const toggleMass = async (battleId: string) => {
    if (battleId === 'unknown') return;
    if (massSaving[battleId]) return;
    const battle = battles.find(b => b.battleId === battleId);
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

      setBattles(prev => prev
        .map(b => ({ ...b, applies: b.applies.filter(a => a.id !== applyId) }))
        .filter(b => b.applies.length > 0)
      );
      toast.success(t('guild_dashboard.regear_approval.supplement.deleted', { defaultValue: '已删除' }));
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    } finally {
      setDeleteSaving(prev => ({ ...prev, [applyId]: false }));
    }
  };

  const handleGenerateSupplementTicket = async () => {
    if (loading) return;
    const valid_battles = sortedBattles.filter(b => b.battleId !== 'unknown').filter(b => b.applies.filter(a => a.status === ApplyStatus.PENDING_AUDIT).length > 0)
    const battleIds = valid_battles.map(b => b.battleId);
    if (battleIds.length === 0) return;

    const hasNonMass = valid_battles.some(b => !b.types.includes(BattleType.MASS));
    if (hasNonMass) {
      const ok = await confirm({
        message: t('guild_dashboard.regear_approval.supplement.confirm_non_mass', { defaultValue: '存在未标记为 MASS 的战斗，仍要生成补装工单吗？' }),
      });
      if (!ok) return;
    }

    onRegearPreview(battleIds, true);
  };

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

  const normalizeApplyTimestamp = (ts: string) => {
    const s = ts.trim();
    if (!s) return '';
    if (/[zZ]$/.test(s) || /[+\-]\d{2}:?\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s)) return `${s}Z`;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s)) return `${s}Z`;
    return s;
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
            <button
              onClick={() => setGroupByBattle(!groupByBattle)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-2",
                groupByBattle
                  ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                  : "bg-black-bg border-black-border text-slate-400 hover:text-slate-200 hover:border-slate-700"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", groupByBattle ? "bg-emerald-500" : "bg-slate-500")} />
              {t('guild_dashboard.regear_approval.filters.group_by_battle', { defaultValue: 'Group by battle' })}
            </button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleGenerateSupplementTicket}
              disabled={loading || sortedBattles.filter(b => b.battleId !== 'unknown').length === 0}
            >
              {t('guild_dashboard.regear_approval.supplement.generate', { defaultValue: '生成补装工单' })}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
              {t('guild_dashboard.regear_approval.filters.status', { defaultValue: 'Status' })}
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(o => {
                const isActive = o.value === 'all' 
                  ? status.length === statusOptions.length - 1 
                  : status.includes(o.value as ApplyStatus);
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      if (o.value === 'all') {
                        if (status.length === statusOptions.length - 1) {
                          setStatus([]); // 取消全选
                        } else {
                          setStatus(statusOptions.filter(opt => opt.value !== 'all').map(opt => opt.value as ApplyStatus)); // 全选
                        }
                      } else {
                        setStatus(prev => {
                          const isSelected = prev.includes(o.value as ApplyStatus);
                          if (isSelected) {
                            return prev.filter(s => s !== o.value);
                          } else {
                            return [...prev, o.value as ApplyStatus];
                          }
                        });
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
                      isActive 
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                        : "bg-black-bg border-black-border text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
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
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="py-10 text-center text-slate-500">
            {t('guild_dashboard.regear_approval.states.loading', { defaultValue: 'Loading...' })}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-rose-500">
            {t('guild_dashboard.regear_approval.states.error', { defaultValue: 'Failed to load regear applies' })}: {error}
          </div>
        ) : sortedBattles.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            {t('guild_dashboard.regear_approval.states.empty', { defaultValue: 'No regear applies found' })}
          </div>
        ) : !groupByBattle ? (
          <div className="bg-black-bg border border-black-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
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
                  {sortedBattles
                    .flatMap(b => b.applies)
                    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
                    .map((row) => (
                      <RegearApplyRow
                        key={row.id}
                        row={row}
                        usersMap={usersMap}
                        channelsMap={channelsMap}
                        deleteSaving={!!deleteSaving[row.id]}
                        formatTime={formatTime}
                        normalizeApplyTimestamp={normalizeApplyTimestamp}
                        getStatusBadge={getStatusBadge}
                        onShowDeathDetails={handleShowDeathDetails}
                        onSetSelectedImage={setSelectedImage}
                        onDeleteApply={deleteApply}
                      />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          sortedBattles.map((battle) => (
            <div key={battle.battleId} className="bg-black-bg border border-black-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-black-border bg-black-card/50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span>{battle.battleId === 'unknown' ? t('common.unknown_battle', { defaultValue: 'Unknown Battle' }) : `${t('guild_dashboard.regear_approval.supplement.battle', { defaultValue: 'Battle' })} #${battle.battleId}`}</span>
                    <span className="text-[10px] text-slate-500 bg-black-border/50 px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                      {getBattleTimeRange(battle.applies)}
                    </span>
                  </div>
                  {battle.battleId !== 'unknown' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {(battle.types.length === 0 ? [t('guild_dashboard.regear_approval.supplement.no_tag', { defaultValue: '无标签' })] : battle.types).map((tag) => (
                        <Badge key={String(tag)} variant={String(tag) === BattleType.MASS ? 'warning' : 'default'}>
                          {String(tag)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Badge variant="gold">
                    {t('guild_dashboard.regear_approval.supplement.apply_count', { defaultValue: '{{count}} 条申请', count: battle.applies.length })}
                  </Badge>
                </div>

                {battle.battleId !== 'unknown' && (
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
                )}
              </div>

              <div className="overflow-x-auto">
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
                    {battle.applies.map((row) => (
                      <RegearApplyRow
                        key={row.id}
                        row={row}
                        usersMap={usersMap}
                        channelsMap={channelsMap}
                        deleteSaving={!!deleteSaving[row.id]}
                        formatTime={formatTime}
                        normalizeApplyTimestamp={normalizeApplyTimestamp}
                        getStatusBadge={getStatusBadge}
                        onShowDeathDetails={handleShowDeathDetails}
                        onSetSelectedImage={setSelectedImage}
                        onDeleteApply={deleteApply}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

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
