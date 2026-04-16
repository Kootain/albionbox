import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Share2, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AggregationControl } from './AggregationControl';
import { StatsTables } from './StatsTables';
import { PlayerStats } from './PlayerStats';
import { DeathRecords } from './DeathRecords';
import { api } from '@/lib/api';
import { getAlbionItemUrl } from '@/lib/utils';
import { PlayerStatRecord, StatsRecord } from './types';
import { AlbionOfficialEvent } from '@albionbox/shared'


interface BattleDetailProps {
  battleIds: string[];
  onBack: () => void;
  isStandalone?: boolean;
}

export function BattleDetail({ battleIds, onBack, isStandalone }: BattleDetailProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [allianceStats, setAllianceStats] = useState<StatsRecord[]>([]);
  const [guildStats, setGuildStats] = useState<StatsRecord[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatRecord[]>([]);
  const [deathRecords, setDeathRecords] = useState<AlbionOfficialEvent[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const guildMap = new Map<string, StatsRecord>();
        const allianceMap = new Map<string, StatsRecord>();
        const playerMap = new Map<string, PlayerStatRecord>();
        const mappedDeaths: AlbionOfficialEvent[] = [];

        // Track unique participants per guild/alliance to avoid overcounting
        const guildParticipants = new Map<string, Set<string>>();
        const allianceParticipants = new Map<string, Set<string>>();

        // Helper to ensure guild exists in map
        const ensureGuild = (id: string, name: string) => {
          if (!id) return null;
          if (!guildMap.has(id)) {
            guildMap.set(id, { id, name: name || 'None', participants: 0, kills: 0, deaths: 0, killFame: 0, deathFame: 0 });
            guildParticipants.set(id, new Set());
          }
          return guildMap.get(id)!;
        };

        // Helper to ensure alliance exists in map
        const ensureAlliance = (id: string, name: string) => {
          if (!id) return null;
          if (!allianceMap.has(id)) {
            allianceMap.set(id, { id, name: name || 'None', participants: 0, kills: 0, deaths: 0, killFame: 0, deathFame: 0 });
            allianceParticipants.set(id, new Set());
          }
          return allianceMap.get(id)!;
        };

        const mapEquipmentToArray = (equipment: any) => {
          if (!equipment) return Array(10).fill({ slot: '', url: '' });
          
          // Must exactly match the order expected by KillDetailModal's EquipmentGrid:
          // 0:Bag, 1:Head, 2:Cape, 3:MainHand, 4:Armor, 5:OffHand, 6:Potion, 7:Shoes, 8:Food, 9:Mount
          const slots = ['Bag', 'Head', 'Cape', 'MainHand', 'Armor', 'OffHand', 'Potion', 'Shoes', 'Food', 'Mount'];
          
          return slots.map(slot => ({
            slot: slot.toLowerCase(),
            url: equipment[slot]?.Type 
              ? getAlbionItemUrl(equipment[slot].Type, 1, equipment[slot].Quality) 
              : ''
          }));
        };

        // Concurrently fetch all battle IDs
        await Promise.all(
          battleIds.map(async (battleId) => {
            let offset = 0;
            const limit = 50;
            let hasMore = true;

            while (hasMore && !isCancelled) {
              const cacheKey = `albion_battle_${battleId}_${offset}_${limit}`;
              let eventsData: AlbionOfficialEvent[] = [];
              const cachedData = sessionStorage.getItem(cacheKey);

              if (cachedData) {
                eventsData = JSON.parse(cachedData);
              } else {
                const eventsRes = await api.guilds.test.albion.events.$get({
                  query: { battleId, limit: String(limit), offset: String(offset) }
                });
                
                if (!eventsRes.ok) throw new Error(`Failed to fetch events for battle ${battleId}`);
                eventsData = (await eventsRes.json());

                if (eventsData && eventsData.length > 0) {
                  try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(eventsData));
                  } catch (e) {
                    console.warn('SessionStorage quota exceeded, skipping cache for:', cacheKey);
                  }
                }
              }

              if (!eventsData || eventsData.length === 0) {
                hasMore = false;
                break;
              }

              for (const ev of eventsData) {
                // Determine all participants in this event
                const participants = ev.Participants || [];
                // Group members could also be considered participants if they were nearby but maybe didn't deal damage
                const groupMembers = ev.GroupMembers || [];
                const allPlayersInvolved = [...participants, ...groupMembers];

                // Register all involved players for participants count
                for (const p of allPlayersInvolved) {
                  if (p.Id && p.GuildId) {
                    ensureGuild(p.GuildId, p.GuildName);
                    guildParticipants.get(p.GuildId)!.add(p.Id);
                  }
                  if (p.Id && p.AllianceId) {
                    ensureAlliance(p.AllianceId, p.AllianceName);
                    allianceParticipants.get(p.AllianceId)!.add(p.Id);
                  }
                }

                // Process Victim first to establish baseline
                if (ev.Victim && ev.Victim.Id) {
                  const p = ev.Victim;
                  
                  // Ensure victim counts as participant
                  if (p.GuildId) {
                    ensureGuild(p.GuildId, p.GuildName);
                    guildParticipants.get(p.GuildId)!.add(p.Id);
                  }
                  if (p.AllianceId) {
                    ensureAlliance(p.AllianceId, p.AllianceName);
                    allianceParticipants.get(p.AllianceId)!.add(p.Id);
                  }

                  if (!playerMap.has(p.Id)) {
                      playerMap.set(p.Id, {
                        id: p.Id,
                        name: p.Name,
                        weapon: p.Equipment?.MainHand?.Type ? getAlbionItemUrl(p.Equipment.MainHand.Type, 1, p.Equipment.MainHand.Quality) : '',
                        guild: p.GuildName || 'None',
                        alliance: p.AllianceName || 'None',
                      ip: Math.round(p.AverageItemPower || 0),
                      kills: 0, deaths: 0, killFame: 0, deathFame: 0
                    });
                  }
                  const pStat = playerMap.get(p.Id)!;
                  pStat.deaths += 1;
                  pStat.deathFame += ev.TotalVictimKillFame || 0;

                  // Guild
                  if (p.GuildId) {
                    const gStat = ensureGuild(p.GuildId, p.GuildName)!;
                    gStat.deaths += 1;
                    gStat.deathFame += ev.TotalVictimKillFame || 0;
                  }

                  // Alliance
                  if (p.AllianceId) {
                    const aStat = ensureAlliance(p.AllianceId, p.AllianceName)!;
                    aStat.deaths += 1;
                    aStat.deathFame += ev.TotalVictimKillFame || 0;
                  }
                }

                // Process Killer
                if (ev.Killer && ev.Killer.Id) {
                  const p = ev.Killer;

                  if (p.GuildId) {
                    ensureGuild(p.GuildId, p.GuildName);
                    guildParticipants.get(p.GuildId)!.add(p.Id);
                  }
                  if (p.AllianceId) {
                    ensureAlliance(p.AllianceId, p.AllianceName);
                    allianceParticipants.get(p.AllianceId)!.add(p.Id);
                  }

                  if (!playerMap.has(p.Id)) {
                      playerMap.set(p.Id, {
                        id: p.Id,
                        name: p.Name,
                        weapon: p.Equipment?.MainHand?.Type ? getAlbionItemUrl(p.Equipment.MainHand.Type, 1, p.Equipment.MainHand.Quality) : '',
                        guild: p.GuildName || 'None',
                        alliance: p.AllianceName || 'None',
                      ip: Math.round(p.AverageItemPower || 0),
                      kills: 0, deaths: 0, killFame: 0, deathFame: 0
                    });
                  }
                  const pStat = playerMap.get(p.Id)!;
                  pStat.kills += 1;
                  // Only killer gets the personal stat in this simple aggregation
                  pStat.killFame += ev.TotalVictimKillFame || 0;

                  // Guild - Kills are attributed to the main killer's guild
                  if (p.GuildId) {
                    const gStat = ensureGuild(p.GuildId, p.GuildName)!;
                    gStat.kills += 1;
                  }

                  // Alliance - Kills are attributed to the main killer's alliance
                  if (p.AllianceId) {
                    const aStat = ensureAlliance(p.AllianceId, p.AllianceName)!;
                    aStat.kills += 1;
                  }
                }

                // Distribute Kill Fame accurately among participants based on Damage/Healing Done
                // If API provides FameRatio or DamageDone, use it. Otherwise divide evenly among participants
                const validParticipants = participants.filter((p: any) => p.DamageDone > 0 || p.SupportHealingDone > 0);
                const totalFame = ev.TotalVictimKillFame || 0;
                
                if (validParticipants.length > 0) {
                  const totalDamageAndHeal = validParticipants.reduce((sum: number, p: any) => sum + (p.DamageDone || 0) + (p.SupportHealingDone || 0), 0);
                  
                  validParticipants.forEach((p: any) => {
                    const contribution = (p.DamageDone || 0) + (p.SupportHealingDone || 0);
                    const fameShare = totalDamageAndHeal > 0 ? (contribution / totalDamageAndHeal) * totalFame : 0;
                    
                    if (p.GuildId) {
                      const gStat = ensureGuild(p.GuildId, p.GuildName)!;
                      gStat.killFame += fameShare;
                    }
                    
                    if (p.AllianceId) {
                      const aStat = ensureAlliance(p.AllianceId, p.AllianceName)!;
                      aStat.killFame += fameShare;
                    }
                  });
                } else if (ev.Killer && ev.Killer.Id) {
                  // Fallback: If no valid participants list, give all fame to the killer's guild/alliance
                  if (ev.Killer.GuildId) {
                    const gStat = ensureGuild(ev.Killer.GuildId, ev.Killer.GuildName)!;
                    gStat.killFame += totalFame;
                  }
                  if (ev.Killer.AllianceId) {
                    const aStat = ensureAlliance(ev.Killer.AllianceId, ev.Killer.AllianceName)!;
                    aStat.killFame += totalFame;
                  }
                }

                // Death Record
                mappedDeaths.push(ev);
              }

              if (eventsData.length < limit) {
                hasMore = false;
              } else {
                offset += limit;
              }
            }
          })
        );

        if (isCancelled) return;

        // Assign final exact participant counts based on Set sizes
        for (const [guildId, participantsSet] of guildParticipants.entries()) {
          if (guildMap.has(guildId)) {
            guildMap.get(guildId)!.participants = participantsSet.size;
          }
        }
        for (const [allianceId, participantsSet] of allianceParticipants.entries()) {
          if (allianceMap.has(allianceId)) {
            allianceMap.get(allianceId)!.participants = participantsSet.size;
          }
        }

        setGuildStats(Array.from(guildMap.values()));
        setAllianceStats(Array.from(allianceMap.values()));
        setPlayerStats(Array.from(playerMap.values()));
        
        // Sort death records by time descending
        mappedDeaths.sort((a, b) => new Date(b.TimeStamp).getTime() - new Date(a.TimeStamp).getTime());
        setDeathRecords(mappedDeaths);

      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (battleIds.length > 0) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [battleIds.join(',')]);

  const handleShare = () => {
    const url = `${window.location.origin}/battles/${battleIds.join(',')}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-card p-4 rounded-xl border border-black-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('guild_dashboard.battle_report.details_title')}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {battleIds.length > 1 ? t('guild_dashboard.battle_report.aggregated_view') : t('guild_dashboard.battle_report.single_view')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isStandalone && (
            <Link
              to={`/battles/${battleIds.join(',')}`}
              target="_blank"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-black-bg border border-black-border hover:border-gold/30 text-slate-300 hover:text-gold rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">{t('guild_dashboard.battle_report.open_in_new_tab')}</span>
            </Link>
          )}
          <button 
            onClick={handleShare}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gold hover:bg-gold-hover text-black rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-gold/10 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? t('guild_dashboard.battle_report.copied') : t('guild_dashboard.battle_report.share')}</span>
          </button>
        </div>
      </div>

      {/* Aggregation Control (Top section for IDs management) */}
      <AggregationControl initialIds={battleIds} />

      {/* Part 1: Alliance and Guild Stats */}
      {loading ? (
        <div className="flex justify-center p-8 text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : error ? (
        <div className="text-center p-8 text-rose-500">{error}</div>
      ) : (
        <>
          <StatsTables allianceStats={allianceStats} guildStats={guildStats} />

          {/* Part 2: Player Stats */}
          <PlayerStats data={playerStats} />

          {/* Part 3: Death Records List */}
          <DeathRecords data={deathRecords} />
        </>
      )}
    </div>
  );
}
