import { useState } from 'react';
import { Swords } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BattleList } from './battle-report-components/BattleList';
import { BattleDetail } from './battle-report-components/BattleDetail';

export function BattleReportTab({ guildName, guildId, onRegearPreview }: { guildName?: string, guildId?: string, onRegearPreview?: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectDetail = (ids: string[]) => {
    setSelectedIds(ids);
    setView('detail');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedIds([]);
  };

  return (
    <div className="p-4 sm:p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
          <Swords className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('guild_dashboard.battle_report.title')}</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('guild_dashboard.battle_report.desc')}</p>
        </div>
      </div>

      <div className={view === 'list' ? 'block' : 'hidden'}>
        <BattleList onSelectDetail={handleSelectDetail} defaultGuildName={guildName} defaultGuildId={guildId} onRegearPreview={onRegearPreview} />
      </div>
      
      <div className={view === 'detail' ? 'block' : 'hidden'}>
        {view === 'detail' && (
          <BattleDetail battleIds={selectedIds} onBack={handleBackToList} />
        )}
      </div>
    </div>
  );
}
