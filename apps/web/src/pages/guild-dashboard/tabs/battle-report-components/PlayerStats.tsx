import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlayerStatRecord } from './types';
import { formatFame } from '@/lib/utils';

export function PlayerStats({ data }: { data: PlayerStatRecord[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [guildFilter, setGuildFilter] = useState('All');
  const [allianceFilter, setAllianceFilter] = useState('All');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const guilds = ['All', ...Array.from(new Set(data.map(p => p.guild)))];
  const alliances = ['All', ...Array.from(new Set(data.map(p => p.alliance)))];

  const filtered = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (guildFilter !== 'All' && p.guild !== guildFilter) return false;
    if (allianceFilter !== 'All' && p.alliance !== allianceFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="bg-black-card border border-black-border rounded-2xl overflow-hidden shadow-xl mb-8">
      <div className="p-4 sm:p-6 border-b border-black-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.battle_report.player_stats')}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder={t('guild_dashboard.battle_report.search_name')} 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-black-bg border border-black-border rounded-lg text-sm text-white focus:outline-none focus:border-gold/50 w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-black-bg/50 border-b border-black-border">
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.stats_columns.player')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest relative group">
                <div className="flex items-center gap-1 cursor-pointer">
                  {t('guild_dashboard.battle_report.stats_columns.alliance')} <ChevronDown className="w-3 h-3" />
                </div>
                <div className="absolute top-full left-0 hidden group-hover:block z-10 pt-1">
                  <div className="bg-black-card border border-black-border rounded shadow-xl min-w-max max-h-60 overflow-y-auto py-1 custom-scrollbar">
                    {alliances.map(a => (
                      <div key={a} onClick={() => { setAllianceFilter(a); setPage(1); }} className="px-4 py-1.5 text-sm text-slate-300 hover:bg-black-bg cursor-pointer whitespace-nowrap">
                        {a === 'All' ? t('guild_dashboard.battle_report.all') : a}
                      </div>
                    ))}
                  </div>
                </div>
              </th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest relative group">
                <div className="flex items-center gap-1 cursor-pointer">
                  {t('guild_dashboard.battle_report.stats_columns.guild')} <ChevronDown className="w-3 h-3" />
                </div>
                <div className="absolute top-full left-0 hidden group-hover:block z-10 pt-1">
                  <div className="bg-black-card border border-black-border rounded shadow-xl min-w-max max-h-60 overflow-y-auto py-1 custom-scrollbar">
                    {guilds.map(g => (
                      <div key={g} onClick={() => { setGuildFilter(g); setPage(1); }} className="px-4 py-1.5 text-sm text-slate-300 hover:bg-black-bg cursor-pointer whitespace-nowrap">
                        {g === 'All' ? t('guild_dashboard.battle_report.all') : g}
                      </div>
                    ))}
                  </div>
                </div>
              </th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.stats_columns.ip')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.stats_columns.kd')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.stats_columns.kill_fame')}</th>
              <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.stats_columns.death_fame')}</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map(p => (
              <tr key={p.id} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img src={p.weapon} alt="weapon" className="w-6 h-6 object-contain" />
                    <span className="font-bold text-white text-sm">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-300">{p.alliance && p.alliance !== 'None' ? `[${p.alliance}]` : ''}</td>
                <td className="py-3 px-4 text-sm text-slate-300">{p.guild}</td>
                <td className="py-3 px-4 text-sm text-slate-300 text-right">{p.ip}</td>
                <td className="py-3 px-4 text-right">
                  <span className="text-emerald-500 font-bold text-sm">{p.kills}</span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-rose-500 font-bold text-sm">{p.deaths}</span>
                </td>
                <td className="py-3 px-4 text-emerald-500 text-sm font-bold text-right">{formatFame(p.killFame)}</td>
                <td className="py-3 px-4 text-rose-500 text-sm font-bold text-right">{formatFame(p.deathFame)}</td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500 text-sm">{t('guild_dashboard.battle_report.no_players')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-black-border flex items-center justify-between bg-black-bg/30">
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