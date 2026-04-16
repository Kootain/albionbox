import { Link2, Unlink, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AggregationControlProps {
  initialIds: string[];
}

export function AggregationControl({ initialIds }: AggregationControlProps) {
  const { t } = useTranslation();
  // Mock complex state: 
  // 'singles': loose IDs
  // 'groups': grouped IDs
  const [singles, setSingles] = useState<string[]>(initialIds.slice(0, 1));
  const [groups, setGroups] = useState<{ id: string, items: string[] }[]>(
    initialIds.length > 1 ? [{ id: 'group_1', items: initialIds.slice(1) }] : []
  );

  const handleRemoveSingle = (id: string) => {
    setSingles(prev => prev.filter(x => x !== id));
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroups(prev => prev.filter(x => x.id !== groupId));
  };

  const handleBindAll = () => {
    if (singles.length > 0) {
      setGroups(prev => [...prev, { id: `group_${Date.now()}`, items: singles }]);
      setSingles([]);
    }
  };

  const handleUnbindGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSingles(prev => [...prev, ...group.items]);
      setGroups(prev => prev.filter(x => x.id !== groupId));
    }
  };

  const totalCount = singles.length + groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="bg-black-card border border-black-border rounded-xl p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gold" />
            {t('guild_dashboard.battle_report.aggregated_battles')} ({totalCount})
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t('guild_dashboard.battle_report.manage_bindings')}</p>
        </div>
        <button 
          onClick={handleBindAll}
          disabled={singles.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gold hover:bg-gold-hover disabled:opacity-50 disabled:hover:bg-gold text-black rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
        >
          <Link2 className="w-4 h-4" />
          {t('guild_dashboard.battle_report.bind_loose')}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        {/* Groups */}
        {groups.map((g) => (
          <div key={g.id} className="relative group/box flex items-center gap-2 p-2 border-2 border-dashed border-slate-700 hover:border-gold/50 rounded-xl transition-colors">
            {g.items.map(id => (
              <div key={id} className="relative group/tooltip flex items-center px-3 py-1.5 bg-black-bg border border-black-border rounded-lg opacity-60">
                <span className="text-xs font-bold text-slate-400">{id}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 p-3 bg-black-card border border-black-border shadow-xl rounded-xl z-20">
                  <div className="flex items-center gap-2 text-gold mb-2"><Info className="w-4 h-4"/> <span className="text-xs font-bold">{t('guild_dashboard.battle_report.battle_info')}</span></div>
                  <p className="text-[10px] text-slate-400">{t('guild_dashboard.battle_report.columns.time')}: 2026-04-10 08:57 UTC</p>
                  <p className="text-[10px] text-slate-400">{t('guild_dashboard.battle_report.players')} 105</p>
                </div>
              </div>
            ))}
            
            <div className="flex flex-col gap-1 ml-2">
              <button onClick={() => handleRemoveGroup(g.id)} className="p-1 hover:bg-rose-500/20 text-rose-500 rounded transition-colors" title="Remove entire group from view">
                <X className="w-3 h-3" />
              </button>
              <button onClick={() => handleUnbindGroup(g.id)} className="p-1 hover:bg-sky-500/20 text-sky-500 rounded transition-colors" title="Break aggregation">
                <Unlink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Singles */}
        {singles.map(id => (
          <div key={id} className="relative group/tooltip flex items-center px-3 py-1.5 bg-black-bg border border-gold/30 rounded-lg">
            <span className="text-xs font-bold text-gold">{id}</span>
            <button onClick={() => handleRemoveSingle(id)} className="ml-2 p-0.5 hover:bg-rose-500/20 text-rose-500 rounded transition-colors">
              <X className="w-3 h-3" />
            </button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 p-3 bg-black-card border border-black-border shadow-xl rounded-xl z-20">
              <div className="flex items-center gap-2 text-gold mb-2"><Info className="w-4 h-4"/> <span className="text-xs font-bold">{t('guild_dashboard.battle_report.battle_info')}</span></div>
              <p className="text-[10px] text-slate-400">{t('guild_dashboard.battle_report.columns.time')}: 2026-04-10 08:57 UTC</p>
              <p className="text-[10px] text-slate-400">{t('guild_dashboard.battle_report.players')} 45</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
