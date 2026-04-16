import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatsRecord } from './types';
import { formatFame } from '@/lib/utils';

interface StatsTablesProps {
  allianceStats: StatsRecord[];
  guildStats: StatsRecord[];
}

export function StatsTables({ allianceStats, guildStats }: StatsTablesProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <StatTable title={t('guild_dashboard.battle_report.alliance_stats')} data={allianceStats} />
      <StatTable title={t('guild_dashboard.battle_report.guild_stats')} data={guildStats} />
    </div>
  );
}

function StatTable({ title, data }: { title: string, data: StatsRecord[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Pick<StatsRecord, 'kills' | 'deaths' | 'killFame' | 'deathFame'> | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  const filtered = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = sortKey
    ? filtered
        .map((row, idx) => ({ row, idx }))
        .sort((a, b) => {
          const av = a.row[sortKey];
          const bv = b.row[sortKey];
          if (av === bv) return a.idx - b.idx;
          return sortDir === 'asc' ? av - bv : bv - av;
        })
        .map(x => x.row)
    : filtered;
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const currentData = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSort = (key: keyof Pick<StatsRecord, 'kills' | 'deaths' | 'killFame' | 'deathFame'>) => {
    setPage(1);
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  };

  const sortIndicator = (key: keyof Pick<StatsRecord, 'kills' | 'deaths' | 'killFame' | 'deathFame'>) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="bg-black-card border border-black-border rounded-2xl overflow-hidden shadow-xl flex flex-col">
      <div className="p-4 sm:p-6 border-b border-black-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight">{title}</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder={t('guild_dashboard.battle_report.search_placeholder')} 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 bg-black-bg border border-black-border rounded-lg text-sm text-white focus:outline-none focus:border-gold/50 w-full sm:w-48"
          />
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-black-bg/50 border-b border-black-border">
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.stats_columns.name')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.stats_columns.players')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                <button type="button" onClick={() => toggleSort('kills')} className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
                  {t('guild_dashboard.battle_report.stats_columns.kills')} <span className="text-[9px]">{sortIndicator('kills')}</span>
                </button>
              </th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                <button type="button" onClick={() => toggleSort('deaths')} className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
                  {t('guild_dashboard.battle_report.stats_columns.deaths')} <span className="text-[9px]">{sortIndicator('deaths')}</span>
                </button>
              </th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                <button type="button" onClick={() => toggleSort('killFame')} className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
                  {t('guild_dashboard.battle_report.stats_columns.kill_fame')} <span className="text-[9px]">{sortIndicator('killFame')}</span>
                </button>
              </th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                <button type="button" onClick={() => toggleSort('deathFame')} className="inline-flex items-center gap-1 hover:text-slate-300 transition-colors">
                  {t('guild_dashboard.battle_report.stats_columns.death_fame')} <span className="text-[9px]">{sortIndicator('deathFame')}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.map(row => (
              <tr key={row.id} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                <td className="py-3 px-4 font-bold text-white text-sm">{row.name}</td>
                <td className="py-3 px-4 text-right text-sm text-slate-300">👥 {row.participants}</td>
                <td className="py-3 px-4 text-right text-emerald-500 font-bold text-sm">{row.kills}</td>
                <td className="py-3 px-4 text-right text-rose-500 font-bold text-sm">{row.deaths}</td>
                <td className="py-3 px-4 text-right text-emerald-500 text-xs font-bold">{formatFame(row.killFame)}</td>
                <td className="py-3 px-4 text-right text-rose-500 text-xs font-bold">{formatFame(row.deathFame)}</td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-sm">{t('guild_dashboard.battle_report.no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-black-border flex items-center justify-between bg-black-bg/30 mt-auto">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {t('guild_dashboard.battle_report.page_of', { current: page, total: totalPages || 1 })}
        </span>
        <div className="flex items-center gap-2">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 bg-black-card border border-black-border rounded hover:border-gold/30 disabled:opacity-50 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled={page === totalPages || totalPages === 0} 
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 bg-black-card border border-black-border rounded hover:border-gold/30 disabled:opacity-50 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
