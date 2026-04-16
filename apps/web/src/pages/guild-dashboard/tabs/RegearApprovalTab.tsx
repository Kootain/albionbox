import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BattleType, ApplyStatus } from '@albionbox/shared';
import { Button, Input, Modal, Badge } from '@/components/ui';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { BattleDetail } from './battle-report-components/BattleDetail';

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

export function RegearApprovalTab({
  guildId,
  onRegearPreview,
}: {
  guildId: string;
  onRegearPreview: (battleIds: string[]) => void;
}) {
  const { t } = useTranslation();
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

  const [supplementStartOpen, setSupplementStartOpen] = useState(false);
  const [supplementStartTimeLocal, setSupplementStartTimeLocal] = useState(() => {
    const d = new Date(Date.now() - 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [supplementLoading, setSupplementLoading] = useState(false);
  const [supplementError, setSupplementError] = useState('');
  const [supplementBattles, setSupplementBattles] = useState<SupplementBattle[]>([]);
  const [detailBattleId, setDetailBattleId] = useState<string | null>(null);
  const [massSaving, setMassSaving] = useState<Record<string, boolean>>({});
  const [deleteSaving, setDeleteSaving] = useState<Record<string, boolean>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

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
        const res = await api.regear_applies.$get({
          query: {
            msgGuild: DEFAULT_MSG_GUILD,
            status: status || undefined,
            msgChannel: channel || undefined,
            msgUserid: msgUserID || undefined,
            victimName: victimName || undefined,
            limit: String(LIMIT),
            offset: String(offset),
          },
        });
        if (!res.ok) throw new Error(await res.text().catch(() => 'Failed to fetch regear applies'));
        const json = await res.json() as { total: number; items: RegearApply[] };
        if (!mounted) return;
        setTotal(typeof json.total === 'number' ? json.total : 0);
        setData(Array.isArray(json.items) ? json.items : []);
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
    const isMass = (types: BattleType[]) => types.includes(BattleType.MASS);
    const isPreferred = (types: BattleType[]) => types.length === 0 && !isMass(types);
    copy.sort((a, b) => {
      const ap = isPreferred(a.types) ? 0 : 1;
      const bp = isPreferred(b.types) ? 0 : 1;
      if (ap !== bp) return ap - bp;

      const am = isMass(a.types) ? 1 : 0;
      const bm = isMass(b.types) ? 1 : 0;
      if (am !== bm) return am - bm;

      return Number(b.battleId) - Number(a.battleId);
    });
    return copy;
  }, [supplementBattles]);

  const loadSupplementCandidates = async (startTimeIso: string) => {
    if (supplementLoading) return;
    setSupplementLoading(true);
    setSupplementError('');
    try {
      const res = await api.regear_applies['supplement-candidates'].$get({
        query: { msgGuild: DEFAULT_MSG_GUILD, startTime: startTimeIso },
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

  const handleStartSupplement = async () => {
    if (supplementLoading) return;
    const d = new Date(supplementStartTimeLocal);
    if (Number.isNaN(d.getTime())) {
      toast.error(t('guild_dashboard.regear_approval.supplement.invalid_time', { defaultValue: '无效的开始时间' }));
      return;
    }
    setSupplementStartOpen(false);
    await loadSupplementCandidates(d.toISOString());
  };

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

    onRegearPreview(battleIds);
  };

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: t('common.all', { defaultValue: 'All' }) },
    { value: ApplyStatus.BINDING, label: 'binding' },
    { value: ApplyStatus.BIND_FAILED, label: 'bind_failed' },
    { value: ApplyStatus.PENDING_AUDIT, label: 'pending_audit' },
    { value: ApplyStatus.PENDING_REGEAR, label: 'pending_regear' },
    { value: ApplyStatus.REJECT, label: 'reject' },
    { value: ApplyStatus.DONE, label: 'done' },
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
        {s}
      </span>
    );
  };

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.channel', { defaultValue: 'Channel' })}
              </label>
              <input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder="msgChannel"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.msg_userid', { defaultValue: 'MsgUserID' })}
              </label>
              <input
                value={msgUserID}
                onChange={(e) => setMsgUserID(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder="msgUserid"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                {t('guild_dashboard.regear_approval.filters.victim_name', { defaultValue: 'Victim' })}
              </label>
              <input
                value={victimName}
                onChange={(e) => setVictimName(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder="victimName"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('guild_dashboard.regear_approval.supplement.hint', { defaultValue: '选择开始时间后拉取候选记录，并按 battleId 聚合' })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSupplementStartOpen(true)}
                disabled={supplementLoading}
                loading={supplementLoading}
              >
                {t('guild_dashboard.regear_approval.supplement.start', { defaultValue: '开始补装' })}
              </Button>
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
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.time', { defaultValue: 'Time' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.status', { defaultValue: 'Status' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.victim', { defaultValue: 'Victim' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.victim_guild', { defaultValue: 'Victim Guild' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.msg_user', { defaultValue: 'Msg User' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.channel', { defaultValue: 'Channel' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_approval.table.regear_id', { defaultValue: 'RegearID' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ApplyID</th>
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
              ) : data.map((row) => (
                <tr key={row.id} className="hover:bg-black-card/50 transition-colors">
                  <td className="py-4 px-4 text-sm text-slate-300">{formatTime(row.createTime)}</td>
                  <td className="py-4 px-4">{getStatusBadge(row.status)}</td>
                  <td className="py-4 px-4 text-sm text-slate-200 font-bold">{row.victimName || '-'}</td>
                  <td className="py-4 px-4 text-xs text-slate-400">{row.victimGuild || '-'}</td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-200 font-bold">{row.msgUsername || '-'}</span>
                      <span className="text-[10px] text-slate-600 font-mono">{row.msgUserid || '-'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-400 font-mono">{row.msgChannel || '-'}</td>
                  <td className="py-4 px-4 text-xs text-slate-400 font-mono">{row.regearId || '-'}</td>
                  <td className="py-4 px-4 text-xs text-slate-600 font-mono">{row.id}</td>
                </tr>
              ))}
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
                      <div className="text-sm font-black text-white">
                        Battle #{battle.battleId}
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

      {supplementStartOpen && (
        <Modal
          title={t('guild_dashboard.regear_approval.supplement.start_modal_title', { defaultValue: '开始补装' })}
          onClose={() => setSupplementStartOpen(false)}
        >
          <div className="space-y-4">
            <Input
              label={t('guild_dashboard.regear_approval.supplement.start_time', { defaultValue: '开始时间' })}
              type="datetime-local"
              value={supplementStartTimeLocal}
              onChange={(e) => setSupplementStartTimeLocal(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setSupplementStartOpen(false)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button onClick={handleStartSupplement} loading={supplementLoading}>
                {t('common.confirm', { defaultValue: 'Confirm' })}
              </Button>
            </div>
          </div>
        </Modal>
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
    </div>
  );
}
