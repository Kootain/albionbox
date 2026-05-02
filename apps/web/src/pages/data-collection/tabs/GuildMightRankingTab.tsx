import { useTranslation } from 'react-i18next';
import { Upload, Trash2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type CollectionState = {
  [challengeType: string]: {
    guildId: string;
    collectedAt: string;
    players: Record<string, number>;
  };
};

interface GuildMightRankingTabProps {
  collectionData: CollectionState;
  isUploading: boolean;
  onUpload: () => void;
  onClear: () => void;
}

export default function GuildMightRankingTab({
  collectionData,
  isUploading,
  onUpload,
  onClear
}: GuildMightRankingTabProps) {
  const { t } = useTranslation();
  const { success } = useToast();

  const handleCopy = async (players: Record<string, number>) => {
    let tsv = 'Username\tMight\n';
    Object.entries(players)
      .sort(([, mightA], [, mightB]) => mightB - mightA)
      .forEach(([username, might]) => {
        tsv += `${username}\t${Math.round(might / 10000)}\n`;
      });
    
    try {
      await navigator.clipboard.writeText(tsv);
      success(t('common.copy_success', { defaultValue: 'Copied to clipboard' }));
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">{t('common.collected_data')}</h2>
          <button
            onClick={onClear}
            disabled={Object.keys(collectionData).length === 0}
            className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title={t('common.clear_data')}
          >
            <Trash2 className="w-4 h-4" />
            {t('common.clear_data')}
          </button>
        </div>
        <button
          onClick={onUpload}
          disabled={isUploading || Object.keys(collectionData).length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? t('common.upload_data') + '...' : t('common.upload_data')}
        </button>
      </div>
      
      {Object.keys(collectionData).length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-black-border rounded-lg">
          No data collected yet. Connect to WebSocket and wait for events.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(collectionData).map(([challengeType, group]) => (
            <div key={challengeType} className="bg-black-bg border border-black-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-indigo-400">{challengeType}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                    {Object.keys(group.players).length} players
                  </span>
                  <button 
                    onClick={() => handleCopy(group.players)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title={t('common.copy', { defaultValue: 'Copy' })}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(group.players)
                  .sort(([, mightA], [, mightB]) => mightB - mightA)
                  .map(([username, might]) => (
                    <div key={username} className="flex justify-between items-center text-sm border-b border-black-border/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-300">{username}</span>
                      <span className="text-emerald-400 font-mono">{Math.round(might / 10000).toLocaleString()}</span>
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
