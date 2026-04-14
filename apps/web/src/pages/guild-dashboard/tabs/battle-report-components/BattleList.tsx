import { useState, useEffect } from 'react';
import { Link as LinkIcon, Search, CheckSquare, Clock, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BattleReportSummary } from './types';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ui/Confirm';

interface BattleListProps {
  onSelectDetail: (ids: string[]) => void;
  defaultGuildName?: string;
  defaultGuildId?: string;
  onRegearPreview?: (ids: string[]) => void;
}

export function BattleList({ onSelectDetail, defaultGuildName = 'All The Villains', defaultGuildId, onRegearPreview }: BattleListProps) {
  const { t } = useTranslation();
  const [timeFormat, setTimeFormat] = useState<'UTC' | 'Local'>('UTC');
  const [minPlayers, setMinPlayers] = useState<number>(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [battles, setBattles] = useState<BattleReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  // Active guild being viewed
  const [activeGuildId, setActiveGuildId] = useState<string | null>(defaultGuildId || null);

  // Load initial guild on mount if only name is provided
  useEffect(() => {
    if (defaultGuildId) {
      setActiveGuildId(defaultGuildId);
      return;
    }
    async function initGuild() {
      try {
        const searchRes = await api.guilds.test.albion.search.$get({ query: { q: defaultGuildName } });
        if (!searchRes.ok) return;
        const searchData = await searchRes.json() as any;
        const guild = searchData.guilds.find((g: any) => g.Name.toLowerCase() === defaultGuildName.toLowerCase()) || searchData.guilds[0];
        if (guild) {
          setActiveGuildId(guild.Id);
        }
      } catch (e) {
        // Ignore
      }
    }
    initGuild();
  }, [defaultGuildName, defaultGuildId]);

  // Reset pagination when guild changes
  useEffect(() => {
    if (!activeGuildId) return;
    setBattles([]);
    setOffset(0);
    setHasMore(true);
    fetchBattles(activeGuildId, 0, true);
  }, [activeGuildId]);

  const fetchBattles = async (guildId: string, currentOffset: number, isInitial: boolean) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const battlesRes = await api.guilds.test.albion.battles.$get({ query: { guildId, offset: currentOffset.toString(), limit: LIMIT.toString() } });
      if (!battlesRes.ok) throw new Error('Failed to fetch battles');
      const battlesData = await battlesRes.json() as any[];

      if (battlesData.length < LIMIT) {
        setHasMore(false);
      }

      const mappedBattles: BattleReportSummary[] = battlesData.map((b: any) => {
        const guildsArray = Object.values(b.guilds || {}) as any[];
        const ourGuild = guildsArray.find((g: any) => g.id === guildId);
        
        return {
          id: String(b.id),
          startTime: b.startTime,
          aggregatedCount: 0,
          guilds: guildsArray.map((g: any) => ({
            id: g.id,
            name: g.name,
            tag: g.alliance || '',
            participants: Object.values(b.players || {}).filter((p: any) => p.guildId === g.id).length,
            kills: g.kills || 0,
            deaths: g.deaths || 0,
          })).sort((a, b) => b.participants - a.participants),
          totalParticipants: Object.keys(b.players || {}).length,
          totalDeaths: b.totalDeaths || Object.values(b.guilds || {}).reduce((sum: number, g: any) => sum + (g.deaths || 0), 0),
          ourParticipants: ourGuild ? Object.values(b.players || {}).filter((p: any) => p.guildId === ourGuild.id).length : 0,
          ourKills: ourGuild?.kills || 0,
          ourDeaths: ourGuild?.deaths || 0,
          regearTicketId: null
        };
      });

      if (mappedBattles.length > 0) {
        try {
          const ticketCheckRes = await api.guilds[':guildId'].regear.battles['check-tickets'].$post({
            param: { guildId },
            json: { battleIds: mappedBattles.map(b => b.id) }
          });
          if (ticketCheckRes.ok) {
            const ticketMap = await ticketCheckRes.json() as Record<string, string>;
            mappedBattles.forEach(b => {
              if (ticketMap[b.id]) {
                b.regearTicketId = ticketMap[b.id];
              }
            });
          }
        } catch (e) {
          console.error('Failed to check tickets for battles', e);
        }
      }

      setBattles(prev => isInitial ? mappedBattles : [...prev, ...mappedBattles]);
      setOffset(currentOffset + LIMIT);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!activeGuildId || loadingMore || !hasMore) return;
    fetchBattles(activeGuildId, offset, false);
  };

  const formatDate = (isoString: string, isUtc: boolean) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const pad = (n: number) => String(n).padStart(2, '0');
    
    if (isUtc) {
      return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    } else {
      return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  };
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAggregate = () => {
    if (selectedIds.length > 0) {
      onSelectDetail(selectedIds);
    }
  };

  const handleRegearClick = async () => {
    if (!onRegearPreview) return;
    
    // Check if any selected battle already has a regear ticket
    const battlesWithTickets = selectedIds
      .map(id => battles.find(b => b.id === id))
      .filter(b => b && b.regearTicketId);
      
    if (battlesWithTickets.length > 0) {
      const isConfirmed = await confirm({
        title: t('guild_dashboard.battle_report.regear_conflict_title', { defaultValue: 'Ticket Conflict' }),
        message: t('guild_dashboard.battle_report.regear_conflict_warning', { 
          defaultValue: 'Some selected battles already have an associated regear ticket. Creating a new preview will ignore existing tickets. Do you want to proceed?' 
        }),
        confirmText: t('common.continue', { defaultValue: 'Continue' }),
        danger: true
      });
      
      if (!isConfirmed) {
        return;
      }
    }
    
    onRegearPreview(selectedIds);
  };

  const filteredBattles = battles.filter(b => b.ourParticipants >= minPlayers);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-card p-4 rounded-xl border border-black-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black-bg border border-black-border rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500 font-bold uppercase">{t('guild_dashboard.battle_report.min_players')}</span>
            <input 
              type="number" 
              value={minPlayers} 
              onChange={(e) => setMinPlayers(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 bg-transparent text-sm text-white focus:outline-none text-right" 
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTimeFormat(prev => prev === 'UTC' ? 'Local' : 'UTC')}
            className="flex items-center gap-2 px-3 py-2 bg-black-bg border border-black-border hover:border-gold/30 rounded-lg text-xs font-bold text-slate-300 uppercase transition-colors"
          >
            <Clock className="w-4 h-4" />
            {timeFormat}
          </button>
          
          <button 
            onClick={handleRegearClick}
            disabled={selectedIds.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors",
              selectedIds.length > 0 
                ? "bg-gold hover:bg-gold-hover text-black shadow-lg shadow-gold/10" 
                : "bg-black-bg border border-black-border text-slate-500 cursor-not-allowed"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            {t('guild_dashboard.battle_report.regear_btn', { defaultValue: 'Regear' })}
            {selectedIds.length > 0 && ` (${selectedIds.length})`}
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleAggregate}
                className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-hover text-black rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-gold/10 transition-colors"
              >
                {t('guild_dashboard.battle_report.aggregate_btn')} ({selectedIds.length})
              </button>
              <Link
                to={`/battles/${selectedIds.join(',')}`}
                target="_blank"
                className="flex items-center justify-center p-2 bg-black-card border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded-lg transition-colors"
                title={t('guild_dashboard.battle_report.open_in_new_tab')}
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-black-card border border-black-border rounded-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-black-border bg-black-bg/50">
              <th className="py-3 px-4 w-10">
                <CheckSquare className="w-4 h-4 text-slate-500" />
              </th>
              <th className="py-3 px-4 w-10 text-center">
                <div title={t('guild_dashboard.battle_report.columns.regear', { defaultValue: 'Regear Ticket' })}>
                  <ShieldAlert className="w-4 h-4 text-slate-500 mx-auto" />
                </div>
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.time')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.type')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.participating_guilds')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">{t('guild_dashboard.battle_report.columns.total_stats')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">{t('guild_dashboard.battle_report.columns.our_stats')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.battle_report.columns.action')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading battles...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-rose-500">
                  {error}
                </td>
              </tr>
            ) : filteredBattles.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <span>{t('guild_dashboard.battle_report.no_data', { defaultValue: 'No battles found' })}</span>
                  {battles.length > 0 && hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 bg-black-bg border border-black-border hover:border-gold/50 text-gold disabled:opacity-50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all mt-2"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                      {t('guild_dashboard.battle_report.load_more', { defaultValue: 'Load More' })}
                    </button>
                  )}
                </td>
              </tr>
            ) : filteredBattles.map((battle) => (
              <tr key={battle.id} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                <td className="py-4 px-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(battle.id)}
                    onChange={() => toggleSelection(battle.id)}
                    className="accent-gold w-4 h-4 bg-black-bg border-black-border rounded cursor-pointer"
                  />
                </td>
                <td className="py-4 px-4 text-center">
                  {battle.regearTicketId ? (
                    <button
                      onClick={() => {
                        setSearchParams(prev => {
                          prev.set('tab', 'regear');
                          prev.set('ticketId', battle.regearTicketId!);
                          return prev;
                        });
                      }}
                      className="inline-flex items-center justify-center p-1.5 bg-gold/10 text-gold hover:bg-gold hover:text-black border border-gold/30 hover:border-gold rounded-lg transition-all"
                      title={t('guild_dashboard.battle_report.regear_ticket_tooltip', { defaultValue: 'View Regear Ticket' })}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-slate-300">
                  {formatDate(battle.startTime, timeFormat === 'UTC')}
                </td>
                <td className="py-4 px-4">
                  {battle.aggregatedCount > 0 ? (
                    <div className="relative group inline-flex">
                      <LinkIcon className="w-4 h-4 text-gold cursor-pointer" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-black text-[10px] text-white rounded whitespace-nowrap z-10 border border-black-border">
                        {t('guild_dashboard.battle_report.aggregated_tooltip', { count: battle.aggregatedCount })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-bold uppercase">{t('guild_dashboard.battle_report.single_type')}</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    {battle.guilds.slice(0, 5).map(g => (
                      <div key={g.id} className="text-xs flex items-center gap-2">
                        <span className="font-bold text-white w-32 truncate">
                          {g.tag ? `[${g.tag}] ` : ''}{g.name}
                        </span>
                        <span className="text-slate-400 w-12 text-right">👥 {g.participants}</span>
                        <span className="text-emerald-500 w-8 text-right">{g.kills}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-500 w-8">{g.deaths}</span>
                      </div>
                    ))}
                    {battle.guilds.length > 5 && (
                      <span className="text-[10px] text-slate-500 font-bold uppercase cursor-pointer hover:text-gold transition-colors">
                        {t('guild_dashboard.battle_report.more_guilds', { count: battle.guilds.length - 5 })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col text-xs">
                    <span className="text-slate-300 font-bold">👥 {battle.totalParticipants}</span>
                    <span className="text-rose-500 font-bold">💀 {battle.totalDeaths}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col text-xs">
                    <span className="text-gold font-bold">👥 {battle.ourParticipants}</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-emerald-500 font-bold">{battle.ourKills}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-500 font-bold">{battle.ourDeaths}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onSelectDetail([battle.id])}
                      className="px-4 py-2 bg-black-bg border border-black-border hover:border-gold/30 text-gold text-xs font-bold uppercase rounded-lg transition-colors"
                    >
                      {t('guild_dashboard.battle_report.details_btn')}
                    </button>
                    <Link
                      to={`/battles/${battle.id}`}
                      target="_blank"
                      className="p-2 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded-lg transition-colors"
                      title={t('guild_dashboard.battle_report.open_in_new_tab')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Load More Section */}
        {!loading && filteredBattles.length > 0 && hasMore && (
          <div className="p-4 border-t border-black-border flex justify-center bg-black-bg/30">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2 bg-black-card border border-black-border hover:border-gold/50 text-gold disabled:opacity-50 disabled:hover:border-black-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('guild_dashboard.battle_report.loading')}
                </>
              ) : (
                t('guild_dashboard.battle_report.load_more')
              )}
            </button>
          </div>
        )}
        
        {!loading && filteredBattles.length > 0 && !hasMore && (
          <div className="p-4 border-t border-black-border text-center text-xs text-slate-500 uppercase tracking-widest bg-black-bg/30">
            {t('guild_dashboard.battle_report.no_more_battles')}
          </div>
        )}
      </div>
    </div>
  );
}
