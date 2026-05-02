import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { RankingType } from '@albionbox/shared';
import { useToast } from '@/components/ui/Toast';

interface MightRankingsTabProps {
  guildId: string;
}

export function MightRankingsTab({ guildId }: MightRankingsTabProps) {
  const { t } = useTranslation();
  const { success } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dataCollectionGuildId, setDataCollectionGuildId] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  
  const [rankings, setRankings] = useState<Record<string, any>>({});
  const [isFetchingRankings, setIsFetchingRankings] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.guilds[':id'].settings.$get({ param: { id: guildId } });
        if (res.ok) {
          const data = await res.json() as any;
          if (data.dataCollectionGuildId) {
            setDataCollectionGuildId(data.dataCollectionGuildId);
          } else {
            setDataCollectionGuildId(null);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [guildId]);

  useEffect(() => {
    if (!dataCollectionGuildId) return;

    const fetchRankings = async () => {
      setIsFetchingRankings(true);
      try {
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Calculate seconds from now to selected date's end, plus 30 days buffer
        // to ensure we capture records from earlier dates if they haven't been updated recently.
        const secondsFromNowToEndOfDay = Math.max(0, Math.floor((Date.now() - endOfDay.getTime()) / 1000));
        const secondsBuffer = 30 * 24 * 3600; // 30 days buffer
        const totalSeconds = secondsFromNowToEndOfDay + secondsBuffer;

        const newRankings: Record<string, any> = {};

        // Fetch each RankingType
        const promises = Object.values(RankingType).map(async (type) => {
          const res = await api.rankings[':guildId'].rankings[':type'].$get({
            param: { guildId: dataCollectionGuildId, type },
            query: { seconds: totalSeconds.toString() }
          });

          if (res.ok) {
            const data = await res.json() as any;
            // Data is ordered by collectedAt desc, find the first one <= endOfDay
            const record = data.find((r: any) => new Date(r.collectedAt) <= endOfDay);
            if (record && record.data) {
              newRankings[type] = record.data;
            }
          }
        });

        await Promise.all(promises);
        setRankings(newRankings);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingRankings(false);
      }
    };

    fetchRankings();
  }, [dataCollectionGuildId, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!dataCollectionGuildId) {
    return (
      <div className="p-8 text-center bg-black-card border border-black-border rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          {t('guild_dashboard.might_rankings.no_guild_id', { defaultValue: 'Data Collection Guild ID not bound' })}
        </h3>
        <p className="text-slate-400">
          {t('guild_dashboard.might_rankings.bind_hint', { defaultValue: 'Please bind the Data Collection Guild ID in Settings first.' })}
        </p>
      </div>
    );
  }

  const renderRankingCategory = (type: string, title: string) => {
    const data = rankings[type];
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const processedData = data.map(item => {
      const username = Object.keys(item)[0] || 'Unknown';
      const rawMight = item[username] || 0;
      const might = Math.round(rawMight / 10000);
      return { username, might };
    });

    const sortedData = processedData.sort((a, b) => b.might - a.might);

    const handleCopy = async () => {
      let tsv = 'Username\tMight\n';
      sortedData.forEach(item => {
        tsv += `${item.username}\t${item.might}\n`;
      });
      try {
        await navigator.clipboard.writeText(tsv);
        success(t('guild_dashboard.might_rankings.copy_success', { defaultValue: 'Copied to clipboard' }));
      } catch (err) {
        console.error('Failed to copy', err);
      }
    };

    return (
      <div key={type} className="bg-black-card border border-black-border rounded-xl overflow-hidden">
        <div className="bg-black-bg px-4 py-3 border-b border-black-border flex justify-between items-center">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h4>
          <button 
            onClick={handleCopy}
            className="text-slate-400 hover:text-white transition-colors"
            title={t('common.copy', { defaultValue: 'Copy' })}
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {sortedData.map((item, idx) => {
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-black-bg transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 w-4">{idx + 1}</span>
                    <span className="text-sm font-bold text-white truncate max-w-[120px]" title={item.username}>{item.username}</span>
                  </div>
                  <span className="text-sm font-bold text-gold">{item.might.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">
            {t('guild_dashboard.might_rankings.title', { defaultValue: 'Might Rankings' })}
          </h2>
          <p className="text-sm text-slate-400">
            {t('guild_dashboard.might_rankings.desc', { defaultValue: 'View guild might rankings by category' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black-bg border border-black-border rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold transition-colors text-sm font-mono"
          />
        </div>
      </div>

      {isFetchingRankings ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {renderRankingCategory(RankingType.CASTLE, t('rankings.castle', { defaultValue: 'Castle' }))}
          {renderRankingCategory(RankingType.CORRUPTED, t('rankings.corrupted', { defaultValue: 'Corrupted' }))}
          {renderRankingCategory(RankingType.ENERGYCRYSTAL, t('rankings.energycrystal', { defaultValue: 'Energy Crystal' }))}
          {renderRankingCategory(RankingType.GATHERING, t('rankings.gathering', { defaultValue: 'Gathering' }))}
          {renderRankingCategory(RankingType.HELLDUNGEON, t('rankings.helldungeon', { defaultValue: 'Hell Dungeon' }))}
          {renderRankingCategory(RankingType.HELLGATE, t('rankings.hellgate', { defaultValue: 'Hellgate' }))}
          {renderRankingCategory(RankingType.POWERCORE, t('rankings.powercore', { defaultValue: 'Power Core' }))}
          {renderRankingCategory(RankingType.PVE, t('rankings.pve', { defaultValue: 'PvE' }))}
          {renderRankingCategory(RankingType.SMUGGLERS, t('rankings.smugglers', { defaultValue: 'Smugglers' }))}
          {renderRankingCategory(RankingType.SPIDERS, t('rankings.spiders', { defaultValue: 'Spiders' }))}
          {renderRankingCategory(RankingType.TREASURES, t('rankings.treasures', { defaultValue: 'Treasures' }))}
        </div>
      )}
    </div>
  );
}
