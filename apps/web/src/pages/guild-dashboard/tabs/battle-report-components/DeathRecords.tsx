import { useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KillDetailModal } from './KillDetailModal';
import { DeathRecord } from './types';
import { formatFame } from '@/lib/utils';

export function DeathRecords({ data }: { data: DeathRecord[] }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<DeathRecord | null>(null);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const currentData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <>
      <div className="bg-black-card border border-black-border rounded-2xl overflow-hidden shadow-xl mb-8">
        <div className="p-4 sm:p-6 border-b border-black-border">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.battle_report.death_records')}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-black-bg/50 border-b border-black-border">
                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">{t('guild_dashboard.battle_report.columns.time')}</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.killer')}</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.victim')}</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-24">{t('guild_dashboard.battle_report.columns.fame')}</th>
                <th className="py-3 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-24">{t('guild_dashboard.battle_report.columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map(r => (
                <tr key={r.id} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <img src={r.killer.weapon} alt="w" className="w-5 h-5 object-contain" />
                      <span className="text-xs text-slate-400">
                        {r.killer.alliance && r.killer.alliance !== 'None' ? `[${r.killer.alliance}] ` : ''}
                        {r.killer.guild && r.killer.guild !== 'None' ? r.killer.guild : ''}
                      </span>
                      <span className="text-sm font-bold text-emerald-500">{r.killer.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold">({r.killer.ip})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <img src={r.victim.weapon} alt="w" className="w-5 h-5 object-contain" />
                      <span className="text-xs text-slate-400">
                        {r.victim.alliance && r.victim.alliance !== 'None' ? `[${r.victim.alliance}] ` : ''}
                        {r.victim.guild && r.victim.guild !== 'None' ? r.victim.guild : ''}
                      </span>
                      <span className="text-sm font-bold text-rose-500">{r.victim.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold">({r.victim.ip})</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-gold font-bold text-sm">{formatFame(r.fame)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => setSelectedRecord(r)}
                      className="p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors inline-flex items-center justify-center"
                    >
                      <Crosshair className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

      {selectedRecord && (
        <KillDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </>
  );
}