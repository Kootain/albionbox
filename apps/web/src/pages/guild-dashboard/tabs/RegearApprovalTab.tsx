import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ApplyStatus } from '@albionbox/shared';

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
  applyMeta?: string | null;
  status: ApplyStatus;
  victimName?: string | null;
  victimGuild?: string | null;
  applyDetail?: string | null;
};

const DEFAULT_MSG_GUILD = '1248349507148974';
const LIMIT = 20;

export function RegearApprovalTab() {
  const { t } = useTranslation();

  const [status, setStatus] = useState<ApplyStatus | ''>('');
  const [channel, setChannel] = useState('');
  const [msgUserID, setMsgUserID] = useState('');
  const [victimName, setVictimName] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<RegearApply[]>([]);

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
        </div>

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
      </div>

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
    </div>
  );
}
