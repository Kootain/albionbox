import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckSquare, Clock, ExternalLink, Loader2, ShieldAlert, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BattleReportSummary } from './types';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button, Modal } from '@/components/ui';
import { BattleType } from '@albionbox/shared';

interface BattleListProps {
  onSelectDetail: (ids: string[]) => void;
  defaultGuildName?: string;
  defaultGuildId?: string;
  onRegearPreview?: (ids: string[]) => void;
}

export function BattleList({ onSelectDetail, defaultGuildName = 'All The Villains', defaultGuildId, onRegearPreview }: BattleListProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [timeFormat, setTimeFormat] = useState<'UTC' | 'Local'>('UTC');
  const [minPlayers, setMinPlayers] = useState<number>(0);
  const [splitMinutes, setSplitMinutes] = useState<number>(60);
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedOverlapId, setExpandedOverlapId] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [battles, setBattles] = useState<BattleReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [tagEditor, setTagEditor] = useState<{ open: boolean; battleId: string | null; types: BattleType[] }>({
    open: false,
    battleId: null,
    types: [],
  });
  const [tagSaving, setTagSaving] = useState(false);
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadCount, setLoadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false); // Hard lock for network requests
  const isFetchingRef = useRef(false);
  const bottomBoundaryRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;
  const MAX_AUTO_LOAD_PAGES = 10;
  const server: 'asia' | 'eu' | 'us' = 'asia';

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
    setLoadCount(0);
    fetchBattles(activeGuildId, 0, true);
  }, [activeGuildId]);

  const fetchBattles = async (guildId: string, currentOffset: number, isInitial: boolean) => {
    // Prevent fetching if another request is already in flight for the exact same offset
    if (isFetchingRef.current) return;
    
    setIsFetching(true);
    isFetchingRef.current = true;
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
        const ourPlayers = Object.values(b.players || {}).filter((p: any) => p.guildId === guildId).map((p: any) => ({ id: p.id, name: p.name }));
        
        return {
          id: String(b.id),
          startTime: b.startTime,
          endTime: b.endTime,
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
          ourParticipants: ourPlayers.length,
          ourKills: ourGuild?.kills || 0,
          ourDeaths: ourGuild?.deaths || 0,
          ourPlayers: ourPlayers,
          regearTicketId: null,
          tags: []
        };
      });

      if (mappedBattles.length > 0) {
        const battleIds = mappedBattles.map(b => Number(b.id)).filter(n => Number.isFinite(n) && n > 0);
        await Promise.all([
          (async () => {
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
            } catch {}
          })(),
          (async () => {
            if (battleIds.length === 0) return;
            try {
              const tagsRes = await api.guilds[':id'].battles.$post({
                param: { id: guildId },
                json: { server, ids: battleIds },
              });
              if (!tagsRes.ok) return;
              const rows = await tagsRes.json() as Array<{ id: number; types: BattleType[] }>;
              const map = new Map(rows.map(r => [String(r.id), Array.isArray(r.types) ? r.types : []]));
              mappedBattles.forEach(b => {
                b.tags = map.get(b.id) ?? [];
              });
            } catch {}
          })(),
        ]);
      }

      // Auto-load next page if filtering removed all new results
      if (!isInitial && mappedBattles.length > 0 && loadCount < MAX_AUTO_LOAD_PAGES) {
        setBattles(prev => {
          const newTotal = [...prev, ...mappedBattles];
          const newFiltered = newTotal.filter(b => b.ourParticipants >= minPlayers);
          
          if (newFiltered.length === 0 && battlesData.length >= LIMIT) {
            // Fire and forget next fetch if still no filtered results
            setLoadCount(c => c + 1);
            setTimeout(() => fetchBattles(guildId, currentOffset + LIMIT, false), 0);
          }
          return newTotal;
        });
      } else {
        setBattles(prev => isInitial ? mappedBattles : [...prev, ...mappedBattles]);
      }
      setOffset(currentOffset + LIMIT);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
      setIsFetching(false);
      isFetchingRef.current = false;
    }
  };

  const handleLoadMore = () => {
    if (!activeGuildId || isFetchingRef.current || !hasMore) return;
    setLoadCount(prev => prev + 1);
    fetchBattles(activeGuildId, offset, false);
  };

  // IntersectionObserver for auto-load
  useEffect(() => {
    if (battles.length === 0 && !hasMore) return;
    if (!hasMore || !activeGuildId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          if (!isFetchingRef.current && loadCount < MAX_AUTO_LOAD_PAGES) {
            setLoadCount(prev => prev + 1);
            fetchBattles(activeGuildId, offset, false);
          }
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0
      }
    );

    const currentBoundary = bottomBoundaryRef.current;
    if (currentBoundary) {
      observer.observe(currentBoundary);
    }

    return () => {
      if (currentBoundary) {
        observer.unobserve(currentBoundary);
      }
    };
  }, [hasMore, activeGuildId, offset, loadCount, battles.length]);

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
  
  const toggleTagType = (type: BattleType) => {
    setTagEditor(prev => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type],
    }));
  };

  const saveTags = async () => {
    if (!activeGuildId || !tagEditor.battleId) return;
    const battleIdNum = Number(tagEditor.battleId);
    if (!Number.isFinite(battleIdNum) || battleIdNum <= 0) return;

    setTagSaving(true);
    try {
      const res = await api.guilds[':id'].battles[':battleId'].$put({
        param: { id: activeGuildId, battleId: tagEditor.battleId },
        json: { server, types: tagEditor.types },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error((data as any)?.error || 'Failed to save');
      }
      setBattles(prev => prev.map(b => (b.id === tagEditor.battleId ? { ...b, tags: tagEditor.types } : b)));
      setTagEditor({ open: false, battleId: null, types: [] });
      toast.success(t('common.saved', { defaultValue: 'Saved' }));
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save');
    } finally {
      setTagSaving(false);
    }
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
          <div className="flex items-center gap-2 bg-black-bg border border-black-border rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500 font-bold uppercase" title={t('guild_dashboard.battle_report.split_minutes_tooltip', { defaultValue: 'Split list when time gap exceeds this value' })}>
              {t('guild_dashboard.battle_report.split_minutes', { defaultValue: 'Split (min)' })}
            </span>
            <input 
              type="number" 
              value={splitMinutes} 
              onChange={(e) => setSplitMinutes(Math.max(0, parseInt(e.target.value) || 0))}
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
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.battle_report.columns.tags')}</th>
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
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  <span>{t('guild_dashboard.battle_report.no_data', { defaultValue: 'No battles found' })}</span>
                </td>
              </tr>
            ) : filteredBattles.map((battle, index) => {
              const isHovered = hoveredIndex === index;
              const prevBattle = index > 0 ? filteredBattles[index - 1] : null;
              const nextBattle = index < filteredBattles.length - 1 ? filteredBattles[index + 1] : null;

              const getOverlapPlayers = (b1: BattleReportSummary, b2: BattleReportSummary) => {
                if (!b1.ourPlayers || !b2.ourPlayers) return [];
                const set1 = new Set(b1.ourPlayers.map(p => p.id));
                return b2.ourPlayers.filter(p => set1.has(p.id));
              };

              const overlapPrevPlayers = prevBattle ? getOverlapPlayers(battle, prevBattle) : null;
              const overlapNextPlayers = nextBattle ? getOverlapPlayers(battle, nextBattle) : null;

              const renderOverlapTooltip = (players: {id: string, name: string}[], isPrev: boolean) => {
                if (!players.length) return null;
                const isExpanded = expandedOverlapId === `${battle.id}-${isPrev ? 'prev' : 'next'}`;
                const displayPlayers = isExpanded ? players : players.slice(0, 20);
                const hasMore = players.length > 20;
                
                return (
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 hidden group-hover:block w-72 p-3 bg-black text-[10px] text-slate-300 rounded-lg z-[60] border border-black-border shadow-2xl",
                    isPrev ? "bottom-full mb-2" : "top-full mt-2"
                  )}>
                    <div className="font-bold text-gold mb-2 border-b border-black-border pb-1 flex justify-between items-center">
                      <span>{isPrev ? 'Overlap with Previous' : 'Overlap with Next'} ({players.length})</span>
                      {hasMore && (
                        <span className="text-[9px] text-slate-500 font-normal">
                          {isExpanded ? '(Click bubble to collapse)' : '(Click bubble to expand)'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto custom-scrollbar text-left">
                      {displayPlayers.map(p => (
                        <div key={p.id} className="truncate" title={p.name}>{p.name}</div>
                      ))}
                    </div>
                  </div>
                );
              };

              let showSplitter = false;
              if (prevBattle) {
                const currTime = new Date(battle.endTime).getTime();
                const prevTime = new Date(prevBattle.startTime).getTime();
                // Since battles are sorted descending by time (newest first), prevBattle is newer.
                // The gap is prevTime - currTime.
                const diffMinutes = Math.abs(prevTime - currTime) / (1000 * 60);
                if (diffMinutes > splitMinutes) {
                  showSplitter = true;
                }
              }

              return (
              <React.Fragment key={battle.id}>
                {showSplitter && (
                  <tr>
                    <td colSpan={8} className="py-2 px-0 relative">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-rose-500/50" />
                      <div className="relative flex justify-center">
                        <span className="bg-black-bg px-4 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] border border-rose-500/20 rounded-full">
                          {t('guild_dashboard.battle_report.time_gap', { defaultValue: '> {{min}} min gap', min: splitMinutes })}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              <tr 
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setExpandedOverlapId(null);
                }}
                className={cn(
                  "border-b border-black-border/50 hover:bg-black-bg/50 transition-colors relative",
                  isHovered ? "z-10" : ""
                )}
              >
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
                  <button
                    type="button"
                    onClick={() => {
                      setTagEditor({
                        open: true,
                        battleId: battle.id,
                        types: battle.tags ?? [],
                      })
                    }}
                    className={cn(
                      "w-full text-left rounded-lg border border-transparent hover:border-gold/20 transition-colors",
                      "px-2 py-1 -mx-2 -my-1"
                    )}
                  >
                    {battle.tags && battle.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {battle.tags.map(tag => (
                          <Badge key={tag} variant="gold">
                            {t(`guild_dashboard.battle_report.battle_tags.${tag}`)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">-</span>
                    )}
                  </button>
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
                <td className="py-4 px-4 text-center relative">
                  <div className="flex flex-col items-center justify-center text-xs">
                    {isHovered && overlapPrevPlayers !== null && overlapPrevPlayers.length > 0 && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-50">
                        <div 
                          className="bg-gold text-black text-[10px] font-black px-2 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.3)] flex items-center gap-1 relative z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetId = `${battle.id}-prev`;
                            setExpandedOverlapId(expandedOverlapId === targetId ? null : targetId);
                          }}
                        >
                          <Users className="w-3 h-3" />
                          {overlapPrevPlayers.length}
                        </div>
                        {renderOverlapTooltip(overlapPrevPlayers, true)}
                      </div>
                    )}
                    
                    <span className="text-gold font-bold my-1">👥 {battle.ourParticipants}</span>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-emerald-500 font-bold">{battle.ourKills}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-rose-500 font-bold">{battle.ourDeaths}</span>
                    </div>

                    {isHovered && overlapNextPlayers !== null && overlapNextPlayers.length > 0 && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 group cursor-pointer z-50">
                        <div 
                          className="bg-gold text-black text-[10px] font-black px-2 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.3)] flex items-center gap-1 relative z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetId = `${battle.id}-next`;
                            setExpandedOverlapId(expandedOverlapId === targetId ? null : targetId);
                          }}
                        >
                          <Users className="w-3 h-3" />
                          {overlapNextPlayers.length}
                        </div>
                        {renderOverlapTooltip(overlapNextPlayers, false)}
                      </div>
                    )}
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
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {/* Intersection Observer Sentinel */}
        <div ref={bottomBoundaryRef} style={{ height: '1px' }}></div>

        {/* Load More Section */}
        {!loading && hasMore && (
          <div className="p-4 border-t border-black-border flex justify-center bg-black-bg/30">
            {loadCount >= MAX_AUTO_LOAD_PAGES || isFetching ? (
              <button
                onClick={handleLoadMore}
                disabled={isFetching}
                className="flex items-center gap-2 px-6 py-2 bg-black-card border border-black-border hover:border-gold/50 text-gold disabled:opacity-50 disabled:hover:border-black-border rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('guild_dashboard.battle_report.loading', { defaultValue: 'Loading...' })}
                  </>
                ) : (
                  t('guild_dashboard.battle_report.load_more', { defaultValue: 'Load More' })
                )}
              </button>
            ) : (
              <button
                onClick={handleLoadMore}
                disabled={false}
                className="flex items-center gap-2 px-6 py-2 bg-black-card border border-black-border hover:border-gold/50 text-gold rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              >
                {t('guild_dashboard.battle_report.load_more', { defaultValue: 'Load More' })}
              </button>
            )}
          </div>
        )}
        
        {!loading && filteredBattles.length > 0 && !hasMore && (
          <div className="p-4 border-t border-black-border text-center text-xs text-slate-500 uppercase tracking-widest bg-black-bg/30">
            {t('guild_dashboard.battle_report.no_more_battles')}
          </div>
        )}
      </div>

      {tagEditor.open && (
        <Modal
          title={t('guild_dashboard.battle_report.edit_tags', { defaultValue: 'Edit Tags' })}
          onClose={() => {
            if (tagSaving) return;
            setTagEditor({ open: false, battleId: null, types: [] });
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {Object.values(BattleType).map(type => (
                <label
                  key={type}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
                    tagEditor.types.includes(type) ? "bg-gold/10 border-gold/40" : "bg-black-bg border-black-border hover:border-gold/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={tagEditor.types.includes(type)}
                    onChange={() => toggleTagType(type)}
                    className="h-4 w-4 accent-gold"
                    disabled={tagSaving}
                  />
                  <span className={cn("text-xs font-black uppercase tracking-widest", tagEditor.types.includes(type) ? "text-gold" : "text-slate-300")}>
                    {t(`guild_dashboard.battle_report.battle_tags.${type}`)}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={tagSaving}
                onClick={() => setTagEditor({ open: false, battleId: null, types: [] })}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button size="sm" loading={tagSaving} onClick={saveTags}>
                {t('common.save', { defaultValue: 'Save' })}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
