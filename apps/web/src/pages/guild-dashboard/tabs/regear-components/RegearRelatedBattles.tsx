import { useState, useEffect } from 'react';
import { Link as LinkIcon, CheckSquare, Clock, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { BattleReportSummary } from '../battle-report-components/types';

interface RegearRelatedBattlesProps {
  battleIds: string[];
  guildId?: string; // Optional: To highlight our guild's stats
}

export function RegearRelatedBattles({ battleIds, guildId }: RegearRelatedBattlesProps) {
  const { t } = useTranslation();
  const [battles, setBattles] = useState<BattleReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 5;
  const totalPages = Math.ceil(battleIds.length / LIMIT);
  
  const currentBattleIds = battleIds.slice((page - 1) * LIMIT, page * LIMIT);

  useEffect(() => {
    async function fetchBattles() {
      if (currentBattleIds.length === 0) return;
      setLoading(true);
      setError('');
      
      try {
        // Fetch battle details one by one using the events endpoint to reconstruct basic stats since there's no single battle summary endpoint
        const results = await Promise.all(
          currentBattleIds.map(async id => {
            const res = await api.guilds.test.albion.events.$get({ query: { battleId: id, limit: '51', offset: '0' } });
            if (!res.ok) throw new Error(`Failed to fetch events for battle ${id}`);
            const events = await res.json() as any[];
            
            // Reconstruct a simplified battle summary from events
            const guildsMap = new Map<string, { id: string, name: string, tag: string, participants: Set<string>, kills: number, deaths: number }>();
            const totalParticipants = new Set<string>();
            let totalDeaths = 0;
            let startTime = events.length > 0 ? events[0].TimeStamp : new Date().toISOString();

            for (const ev of events) {
              const p = ev.Victim;
              const k = ev.Killer;
              
              if (p) {
                totalParticipants.add(p.Id);
                if (p.GuildId) {
                  if (!guildsMap.has(p.GuildId)) guildsMap.set(p.GuildId, { id: p.GuildId, name: p.GuildName, tag: p.AllianceName || '', participants: new Set(), kills: 0, deaths: 0 });
                  guildsMap.get(p.GuildId)!.participants.add(p.Id);
                  guildsMap.get(p.GuildId)!.deaths += 1;
                }
              }

              if (k && p) {
                totalDeaths++;
                totalParticipants.add(k.Id);
                if (k.GuildId) {
                  if (!guildsMap.has(k.GuildId)) guildsMap.set(k.GuildId, { id: k.GuildId, name: k.GuildName, tag: k.AllianceName || '', participants: new Set(), kills: 0, deaths: 0 });
                  guildsMap.get(k.GuildId)!.participants.add(k.Id);
                  guildsMap.get(k.GuildId)!.kills += 1;
                }
              }
            }

            return {
              id,
              startTime,
              guilds: Array.from(guildsMap.values()).map(g => ({
                ...g,
                participants: g.participants.size
              })),
              totalParticipants: totalParticipants.size,
              totalKills: Array.from(guildsMap.values()).reduce((sum, g) => sum + g.kills, 0),
              totalDeaths
            };
          })
        );

        const mappedBattles: BattleReportSummary[] = results.map((b: any) => {
          const ourGuild = guildId ? b.guilds.find((g: any) => g.id === guildId) : null;
          
          return {
            id: String(b.id),
            startTime: b.startTime,
            endTime: b.endTime,
            aggregatedCount: 0,
            guilds: b.guilds.sort((a: any, b: any) => b.participants - a.participants),
            totalParticipants: b.totalParticipants,
            totalKills: b.totalKills,
            totalDeaths: b.totalDeaths,
            ourParticipants: ourGuild ? ourGuild.participants : 0,
            ourKills: ourGuild?.kills || 0,
            ourDeaths: ourGuild?.deaths || 0,
            ourPlayers: [], // We don't have this data readily available here, but it's required by the interface
          };
        });

        setBattles(mappedBattles);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBattles();
  }, [page, battleIds.join(',')]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">
            {t('guild_dashboard.regear_tab.related_battles_list', { defaultValue: 'Related Battle Reports' })} ({battleIds.length})
          </h3>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-black-card border border-black-border hover:border-gold text-slate-400 hover:text-gold disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {page} / {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-black-card border border-black-border hover:border-gold text-slate-400 hover:text-gold disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-black-card border border-black-border rounded-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-black-border bg-black-bg/50">
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.time')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.type')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.participating_guilds')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">{t('guild_dashboard.battle_report.columns.total_stats')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.columns.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black-border/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-rose-500">
                  {error}
                </td>
              </tr>
            ) : battles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  {t('guild_dashboard.battle_report.no_data')}
                </td>
              </tr>
            ) : battles.map((battle) => (
              <tr key={battle.id} className="hover:bg-black-bg/50 transition-colors">
                <td className="py-4 px-4 text-sm text-slate-300">
                  {formatDate(battle.startTime)} UTC
                </td>
                <td className="py-4 px-4">
                  <span className="text-xs text-slate-500 font-bold uppercase">{t('guild_dashboard.battle_report.single_type')}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    {battle.guilds.slice(0, 3).map(g => (
                      <div key={g.id} className="text-xs flex items-center gap-2">
                        <span className={cn("font-bold w-32 truncate", g.id === guildId ? "text-gold" : "text-white")}>
                          {g.tag ? `[${g.tag}] ` : ''}{g.name}
                        </span>
                        <span className="text-slate-400 w-12 text-right">👥 {g.participants}</span>
                        <span className="text-emerald-500 w-8 text-right">{g.kills}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-500 w-8">{g.deaths}</span>
                      </div>
                    ))}
                    {battle.guilds.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        {t('guild_dashboard.battle_report.more_guilds', { count: battle.guilds.length - 3 })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col text-xs">
                    <span className="text-slate-300 font-bold">👥 {battle.totalParticipants}</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-emerald-500 font-bold">{battle.totalKills || battle.guilds.reduce((sum, g) => sum + (g.kills || 0), 0)}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-500 font-bold">{battle.totalDeaths}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/battles/${battle.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Details
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
