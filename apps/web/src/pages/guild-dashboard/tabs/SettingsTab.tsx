import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AlbionSearchResultPlayer, RankingType } from '@albionbox/shared';
import { AutoApprovalPoliciesConfig } from '../components/AutoApprovalPoliciesConfig';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { AlbionPlayerSearch } from '@/components/AlbionPlayerSearch';

interface ChestRoom {
  id: string;
  name: string;
  width: number;
  height: number;
  assignments: {x: number, y: number, playerId: string, playerName: string}[];
}

interface SettingsTabProps {
  guildId?: string;
}

export function SettingsTab({ guildId }: SettingsTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [allowedSlots, setAllowedSlots] = useState<string[]>(['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape']);
  const [defaultPLevel, setDefaultPLevel] = useState<number>(8);
  const [noRegearPlayers, setNoRegearPlayers] = useState<{id: string, name: string}[]>([]);
  const [levelGroups, setLevelGroups] = useState<{id: string, name: string, maxPLevel: number, players: {id: string, name: string}[]}[]>([]);

  const [rooms, setRooms] = useState<ChestRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [kookGuildId, setKookGuildId] = useState<string>('');
  const [dataCollectionGuildId, setDataCollectionGuildId] = useState<string>('');
  const [settlementMightRewardEnabledTypes, setSettlementMightRewardEnabledTypes] = useState<string[]>([]);
  const [settlementMightRewardThreshold, setSettlementMightRewardThreshold] = useState<number>(0);
  const [settlementMightRewardRatioByType, setSettlementMightRewardRatioByType] = useState<Record<string, number>>({});
  const [settlementMightTopEnabledTypes, setSettlementMightTopEnabledTypes] = useState<string[]>([]);
  const [settlementMightTopRanksByType, setSettlementMightTopRanksByType] = useState<Record<string, Array<{ rank: number; coinAmount: number }>>>({});
  const [settlementPowercoreCoins, setSettlementPowercoreCoins] = useState({ green: 0, blue: 0, purple: 0, gold: 0 });
  const [settlementEnergycrystalCoins, setSettlementEnergycrystalCoins] = useState({ green: 0, blue: 0, purple: 0, gold: 0 });

  const [activeSearchContext, setActiveSearchContext] = useState<{ type: 'cell', x: number, y: number } | null>(null);

  const allSlots = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Bag', 'Cape', 'Mount', 'Potion', 'Food'];

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  useEffect(() => {
    if (!guildId) return;
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.guilds[':id'].settings.$get({ param: { id: guildId } });
        if (res.ok) {
          const data = await res.json() as any;
          if (data.kookGuildId) setKookGuildId(data.kookGuildId);
          if (data.dataCollectionGuildId) setDataCollectionGuildId(data.dataCollectionGuildId);
          if (data.settlementPreset) {
            const preset = data.settlementPreset;
            if (preset.mightReward?.enabledTypes) setSettlementMightRewardEnabledTypes(preset.mightReward.enabledTypes);
            if (preset.mightReward?.threshold !== undefined) setSettlementMightRewardThreshold(Number(preset.mightReward.threshold) || 0);
            if (preset.mightReward?.ratioByType) setSettlementMightRewardRatioByType(preset.mightReward.ratioByType);
            if (preset.mightTopReward?.enabledTypes) setSettlementMightTopEnabledTypes(preset.mightTopReward.enabledTypes);
            if (preset.mightTopReward?.topConfigByType) {
              const ranks: Record<string, Array<{ rank: number; coinAmount: number }>> = {};
              for (const [type, cfg] of Object.entries<any>(preset.mightTopReward.topConfigByType)) {
                ranks[type] = Array.isArray(cfg?.rewards) ? cfg.rewards : [];
              }
              setSettlementMightTopRanksByType(ranks);
            }
            if (preset.resourceReward?.powercore?.coinPerUnitByColor) setSettlementPowercoreCoins(preset.resourceReward.powercore.coinPerUnitByColor);
            if (preset.resourceReward?.energycrystal?.coinPerUnitByColor) setSettlementEnergycrystalCoins(preset.resourceReward.energycrystal.coinPerUnitByColor);
          }
          if (data.regearConfig) {
            if (data.regearConfig.allowedSlots) setAllowedSlots(data.regearConfig.allowedSlots);
            if (data.regearConfig.defaultPLevel) setDefaultPLevel(data.regearConfig.defaultPLevel);
            if (data.regearConfig.policies) {
              if (data.regearConfig.policies.noRegear?.players) setNoRegearPlayers(data.regearConfig.policies.noRegear.players);
              if (data.regearConfig.policies.levelGroups) setLevelGroups(data.regearConfig.policies.levelGroups);
            }
          }
          if (data.chestRooms && data.chestRooms.length > 0) {
            setRooms(data.chestRooms);
            setActiveRoomId(data.chestRooms[0].id);
          } else {
            // Default room
            const defaultRoom = { id: 'default', name: 'Main Room', width: 10, height: 10, assignments: [] };
            setRooms([defaultRoom]);
            setActiveRoomId('default');
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

  const handleSave = async (
    currentSlots = allowedSlots, 
    currentRooms = rooms,
    currentPLevel = defaultPLevel,
    currentNoRegear = noRegearPlayers,
    currentLevelGroups = levelGroups,
    currentKookGuildId = kookGuildId,
    currentDataCollectionGuildId = dataCollectionGuildId,
    settlementPreset = ({
      version: 'v1' as const,
      mightReward: {
        enabledTypes: settlementMightRewardEnabledTypes as any,
        threshold: settlementMightRewardThreshold,
        ratioByType: settlementMightRewardRatioByType,
        effectivePolicy: 'ZERO_BELOW_THRESHOLD' as const,
      },
      mightTopReward: {
        enabledTypes: settlementMightTopEnabledTypes as any,
        topConfigByType: settlementMightTopEnabledTypes.reduce((acc, type) => {
          acc[type] = { rewards: settlementMightTopRanksByType[type] ?? [] };
          return acc;
        }, {} as Record<string, { rewards: Array<{ rank: number; coinAmount: number }> }>),
      },
      resourceReward: {
        powercore: { coinPerUnitByColor: settlementPowercoreCoins },
        energycrystal: { coinPerUnitByColor: settlementEnergycrystalCoins },
      },
    }) as any
  ) => {
    if (!guildId) return;
    setIsSaving(true);
    try {
      const res = await api.guilds[':id'].settings.$put({
        param: { id: guildId },
        json: {
          kookGuildId: currentKookGuildId || null,
          dataCollectionGuildId: currentDataCollectionGuildId || null,
          regearConfig: { 
            allowedSlots: currentSlots,
            defaultPLevel: currentPLevel,
            policies: {
              noRegear: { players: currentNoRegear },
              levelGroups: currentLevelGroups
            }
          },
          chestRooms: currentRooms,
          settlementPreset,
        }
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success(t('common.saved', { defaultValue: 'Saved successfully!' }));
    } catch (err) {
      console.error(err);
      toast.error(t('common.save_failed', { defaultValue: 'Failed to save settings' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSlotToggle = (slot: string) => {
    let newSlots;
    if (allowedSlots.includes(slot)) {
      newSlots = allowedSlots.filter(s => s !== slot);
    } else {
      newSlots = [...allowedSlots, slot];
    }
    setAllowedSlots(newSlots);
    handleSave(newSlots, rooms, defaultPLevel, noRegearPlayers, levelGroups);
  };

  const handleAddRoom = () => {
    let nameNum = rooms.length + 1;
    let baseName = `Room${nameNum}`;
    while (rooms.some(r => r.name === baseName)) {
      nameNum++;
      baseName = `Room${nameNum}`;
    }
    
    const newRoom: ChestRoom = {
      id: Math.random().toString(36).substring(2, 9),
      name: baseName,
      width: 10,
      height: 10,
      assignments: []
    };
    const newRooms = [...rooms, newRoom];
    setRooms(newRooms);
    setActiveRoomId(newRoom.id);
    handleSave(allowedSlots, newRooms, defaultPLevel, noRegearPlayers, levelGroups);
  };

  const toggleSettlementType = (list: string[], type: string) => {
    if (list.includes(type)) return list.filter(t => t !== type);
    return [...list, type];
  };

  const ensureSettlementMightTopRanks = (type: string, topN: number) => {
    setSettlementMightTopRanksByType(prev => {
      const existing = prev[type] ?? [];
      const next = Array.from({ length: topN }).map((_, i) => {
        const rank = i + 1;
        const found = existing.find(x => x.rank === rank);
        return found ?? { rank, coinAmount: 0 };
      });
      return { ...prev, [type]: next };
    });
  };

  const handleDeleteRoom = async () => {
    if (rooms.length <= 1) {
      toast.error(t('guild_dashboard.settings.cannot_delete_last_room', { defaultValue: 'Cannot delete the last room.' }));
      return;
    }
    if (!(await confirm.confirm({ message: t('guild_dashboard.settings.confirm_delete_room', { defaultValue: 'Are you sure you want to delete this room?' }), danger: true }))) return;
    const newRooms = rooms.filter(r => r.id !== activeRoomId);
    setRooms(newRooms);
    setActiveRoomId(newRooms[0].id);
    handleSave(allowedSlots, newRooms, defaultPLevel, noRegearPlayers, levelGroups);
  };

  const updateActiveRoom = (updates: Partial<ChestRoom>) => {
    const newRooms = rooms.map(r => r.id === activeRoomId ? { ...r, ...updates } : r);
    setRooms(newRooms);
    handleSave(allowedSlots, newRooms, defaultPLevel, noRegearPlayers, levelGroups);
  };

  const handleRoomNameEditComplete = (roomId: string) => {
    if (!editingRoomId) return;
    
    const newName = editingRoomName.trim();
    if (!newName) {
      setEditingRoomId(null);
      return;
    }

    if (rooms.some(r => r.id !== roomId && r.name === newName)) {
      toast.error('Room name already exists.');
      return;
    }

    const newRooms = rooms.map(r => r.id === roomId ? { ...r, name: newName } : r);
    setRooms(newRooms);
    setEditingRoomId(null);
    handleSave(allowedSlots, newRooms, defaultPLevel, noRegearPlayers, levelGroups);
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const assignPlayer = (player: AlbionSearchResultPlayer) => {
    if (!activeSearchContext || activeSearchContext.type !== 'cell') return;
    
    if (!activeRoom) return;
    const newAssignments = [...activeRoom.assignments];
    const isAlreadyInCell = newAssignments.some(a => a.x === activeSearchContext.x && a.y === activeSearchContext.y && a.playerId === player.Id);
    
    if (!isAlreadyInCell) {
      newAssignments.push({
        x: activeSearchContext.x,
        y: activeSearchContext.y,
        playerId: player.Id,
        playerName: player.Name
      });
      updateActiveRoom({ assignments: newAssignments });
    }
  };

  const removePlayerFromCell = (playerId: string) => {
    if (!activeRoom || !activeSearchContext || activeSearchContext.type !== 'cell') return;
    updateActiveRoom({
      assignments: activeRoom.assignments.filter(a => !(a.x === activeSearchContext.x && a.y === activeSearchContext.y && a.playerId === playerId))
    });
  };

  const isDuplicate = (playerId: string) => {
    if (!activeRoom) return false;
    return activeRoom.assignments.filter(a => a.playerId === playerId).length > 1;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-500/10 text-slate-400 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.title', { defaultValue: 'Guild Settings' })}</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('guild_dashboard.settings.desc', { defaultValue: 'Configure regear rules and chest allocations' })}</p>
          </div>
        </div>
        
        {isSaving && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black-bg border border-black-border text-slate-400 text-xs font-bold rounded-lg shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      <div className="space-y-10">
        {/* Kook Config */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.kook_config', { defaultValue: 'Kook Configuration' })}</h3>
          <p className="text-sm text-slate-400">{t('guild_dashboard.settings.kook_config_desc', { defaultValue: 'Bind your Kook Guild ID to resolve user names and channel names correctly.' })}</p>
          
          <div className="flex items-center gap-4 max-w-md">
            <input
              type="text"
              value={kookGuildId}
              onChange={(e) => setKookGuildId(e.target.value)}
              placeholder="e.g. 1234567890"
              className="flex-1 bg-black-bg border border-black-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors text-sm font-mono"
            />
            <button
              onClick={() => handleSave()}
              className="px-4 py-3 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors"
            >
              {t('common.save', { defaultValue: 'Save' })}
            </button>
          </div>
        </section>

        <hr className="border-black-border" />

        {/* Data Collection Guild Config */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.data_collection_guild_id', { defaultValue: 'Data Collection Guild ID' })}</h3>
          <p className="text-sm text-slate-400">{t('guild_dashboard.settings.data_collection_guild_id_desc', { defaultValue: 'Bind the Data Collection Guild ID to resolve might rankings.' })}</p>
          
          <div className="flex items-center gap-4 max-w-md">
            <input
              type="text"
              value={dataCollectionGuildId}
              onChange={(e) => setDataCollectionGuildId(e.target.value)}
              placeholder="e.g. 1234567890"
              className="flex-1 bg-black-bg border border-black-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors text-sm font-mono"
            />
            <button
              onClick={() => handleSave()}
              className="px-4 py-3 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors"
            >
              {t('common.save', { defaultValue: 'Save' })}
            </button>
          </div>
        </section>

        <hr className="border-black-border" />

        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.settlement_preset.title', { defaultValue: 'Settlement Preset' })}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('guild_dashboard.settings.settlement_preset.desc', { defaultValue: 'Default settlement configuration used when creating a new settlement cycle.' })}</p>
          </div>

          <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
            <div className="text-sm font-bold text-white uppercase tracking-widest">
              {t('guild_dashboard.settings.settlement_preset.might_reward', { defaultValue: 'Might Reward' })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.threshold', { defaultValue: 'Threshold' })}</label>
                <input
                  type="number"
                  value={settlementMightRewardThreshold}
                  onChange={(e) => setSettlementMightRewardThreshold(Number(e.target.value))}
                  className="w-full bg-black-card border border-black-border rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold transition-colors text-sm font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.enabled_types', { defaultValue: 'Enabled Types' })}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(RankingType).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSettlementMightRewardEnabledTypes(prev => {
                        const next = toggleSettlementType(prev, type);
                        setSettlementMightRewardRatioByType((ratioPrev) => {
                          if (next.includes(type)) {
                            if (ratioPrev[type] === undefined) return { ...ratioPrev, [type]: 0 };
                            return ratioPrev;
                          }
                          const { [type]: _, ...rest } = ratioPrev;
                          return rest;
                        });
                        return next;
                      });
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${
                      settlementMightRewardEnabledTypes.includes(type) ? 'border-gold bg-gold/10 text-gold' : 'border-black-border text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {settlementMightRewardEnabledTypes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.ratio_by_type', { defaultValue: 'Ratio by Type' })}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {settlementMightRewardEnabledTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between gap-3 bg-black-card border border-black-border rounded-lg px-3 py-2">
                      <div className="text-xs font-bold text-slate-300">{type}</div>
                      <input
                        type="number"
                        value={settlementMightRewardRatioByType[type] ?? 0}
                        min={0}
                        onChange={(e) => setSettlementMightRewardRatioByType(prev => ({ ...prev, [type]: Number(e.target.value) }))}
                        className="w-32 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
            <div className="text-sm font-bold text-white uppercase tracking-widest">
              {t('guild_dashboard.settings.settlement_preset.might_top', { defaultValue: 'Might TOP Reward' })}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-300">{t('guild_dashboard.settlements.form.enabled_types', { defaultValue: 'Enabled Types' })}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(RankingType).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSettlementMightTopEnabledTypes(prev => toggleSettlementType(prev, type));
                      setTimeout(() => ensureSettlementMightTopRanks(type, 3), 0);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest ${
                      settlementMightTopEnabledTypes.includes(type) ? 'border-gold bg-gold/10 text-gold' : 'border-black-border text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {settlementMightTopEnabledTypes.map(type => (
                <div key={type} className="border border-black-border rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-white">{type}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{t('guild_dashboard.settlements.form.top_n', { defaultValue: 'Top N' })}</span>
                      <input
                        type="number"
                        value={(settlementMightTopRanksByType[type] ?? []).length || 3}
                        min={1}
                        max={50}
                        onChange={(e) => ensureSettlementMightTopRanks(type, Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 bg-black-card border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(settlementMightTopRanksByType[type] ?? []).map(r => (
                      <div key={r.rank} className="flex items-center justify-between gap-2 bg-black-card border border-black-border rounded-lg px-3 py-2">
                        <div className="text-xs font-bold text-slate-300">#{r.rank}</div>
                        <input
                          type="number"
                          value={r.coinAmount}
                          min={0}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setSettlementMightTopRanksByType(prev => ({
                              ...prev,
                              [type]: (prev[type] ?? []).map(x => x.rank === r.rank ? { ...x, coinAmount: value } : x),
                            }));
                          }}
                          className="w-28 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-white text-xs font-mono text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
            <div className="text-sm font-bold text-white uppercase tracking-widest">
              {t('guild_dashboard.settings.settlement_preset.resource_reward', { defaultValue: 'Resource Reward' })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 border border-black-border rounded-xl p-3">
                <div className="text-sm font-bold text-white">{t('guild_dashboard.settlements.form.powercore', { defaultValue: 'Powercore' })}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['green', 'blue', 'purple', 'gold'] as const).map(color => (
                    <div key={color} className="space-y-1">
                      <label className="text-xs font-bold text-slate-400">{color}</label>
                      <input
                        type="number"
                        value={(settlementPowercoreCoins as any)[color]}
                        onChange={(e) => setSettlementPowercoreCoins(prev => ({ ...prev, [color]: Number(e.target.value) }))}
                        className="w-full bg-black-card border border-black-border rounded-lg px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border border-black-border rounded-xl p-3">
                <div className="text-sm font-bold text-white">{t('guild_dashboard.settlements.form.energycrystal', { defaultValue: 'Energy Crystal' })}</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['green', 'blue', 'purple', 'gold'] as const).map(color => (
                    <div key={color} className="space-y-1">
                      <label className="text-xs font-bold text-slate-400">{color}</label>
                      <input
                        type="number"
                        value={(settlementEnergycrystalCoins as any)[color]}
                        onChange={(e) => setSettlementEnergycrystalCoins(prev => ({ ...prev, [color]: Number(e.target.value) }))}
                        className="w-full bg-black-card border border-black-border rounded-lg px-3 py-2 text-white text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={() => handleSave()}
                className="px-4 py-3 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors"
              >
                {t('common.save', { defaultValue: 'Save' })}
              </button>
            </div>
          </div>
        </section>

        <hr className="border-black-border" />

        {/* Regear Rules Config */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.regear_rules', { defaultValue: 'Default Regear Slots' })}</h3>
          <p className="text-sm text-slate-400">{t('guild_dashboard.settings.regear_rules_desc', { defaultValue: 'Select the equipment slots that are eligible for regear by default.' })}</p>
          
          <div className="flex flex-wrap gap-3">
            {allSlots.map(slot => (
              <button
                key={slot}
                onClick={() => handleSlotToggle(slot)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-bold transition-colors cursor-pointer",
                  allowedSlots.includes(slot) 
                    ? "bg-gold/10 border-gold text-gold" 
                    : "bg-black-bg border-black-border text-slate-500 hover:border-slate-700"
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </section>

        <hr className="border-black-border" />

        {/* Auto Approval Policies Config */}
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.policies.title', { defaultValue: 'Auto Approval Policies' })}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('guild_dashboard.settings.policies.desc', { defaultValue: 'Configure special regear policies for specific players or groups.' })}</p>
          </div>

          <AutoApprovalPoliciesConfig
            guildId={guildId || ''}
            config={{
              allowedSlots,
              defaultPLevel,
              policies: {
                noRegear: { players: noRegearPlayers },
                levelGroups
              }
            }}
            onChange={(newConfig) => {
              if (newConfig.allowedSlots) setAllowedSlots(newConfig.allowedSlots);
              if (newConfig.defaultPLevel !== undefined) setDefaultPLevel(newConfig.defaultPLevel);
              if (newConfig.policies?.noRegear?.players) setNoRegearPlayers(newConfig.policies.noRegear.players);
              if (newConfig.policies?.levelGroups) setLevelGroups(newConfig.policies.levelGroups);
            }}
            onSaveApi={async (newConfig) => {
              const res = await api.guilds[':id'].settings.$put({
                param: { id: guildId || '' },
                json: { regearConfig: newConfig }
              });
              if (!res.ok) throw new Error('Failed to save settings');
            }}
          />
        </section>

        <hr className="border-black-border" />

        {/* Chest Config */}
        <section className="space-y-4 relative">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('guild_dashboard.settings.chest_config', { defaultValue: 'Chest Grid Configuration' })}</h3>
              <p className="text-sm text-slate-400">{t('guild_dashboard.settings.chest_config_desc', { defaultValue: 'Configure your NxM chest grid and assign players to cells.' })}</p>
            </div>
            {activeRoom && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-400 font-bold uppercase tracking-widest">
                  {t('guild_dashboard.settings.col', { defaultValue: 'Cols' })}: <input type="number" min="1" max="20" value={activeRoom.width} onChange={e => updateActiveRoom({ width: Number(e.target.value) })} className="w-16 px-2 py-1 bg-black-bg border border-black-border rounded text-white" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-400 font-bold uppercase tracking-widest">
                  {t('guild_dashboard.settings.row', { defaultValue: 'Rows' })}: <input type="number" min="1" max="20" value={activeRoom.height} onChange={e => updateActiveRoom({ height: Number(e.target.value) })} className="w-16 px-2 py-1 bg-black-bg border border-black-border rounded text-white" />
                </label>
              </div>
            )}
          </div>

          {/* Rooms Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-black-border">
            {rooms.map(room => (
              <div key={room.id} className={cn(
                "rounded-t-lg transition-colors border-b border-black-border -mb-[1px]",
                activeRoomId === room.id 
                  ? "bg-black-bg border-t border-l border-r border-black-border border-b-transparent" 
                  : "hover:bg-black-bg/50"
              )}>
                {editingRoomId === room.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingRoomName}
                    onChange={e => setEditingRoomName(e.target.value)}
                    onBlur={() => handleRoomNameEditComplete(room.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRoomNameEditComplete(room.id);
                      if (e.key === 'Escape') setEditingRoomId(null);
                    }}
                    className="px-4 py-2 text-sm font-bold bg-transparent text-white focus:outline-none w-32"
                  />
                ) : (
                  <button
                    onClick={() => setActiveRoomId(room.id)}
                    onDoubleClick={() => {
                      setEditingRoomId(room.id);
                      setEditingRoomName(room.name);
                    }}
                    className={cn(
                      "px-4 py-2 text-sm font-bold whitespace-nowrap",
                      activeRoomId === room.id ? "text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {room.name}
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={handleAddRoom}
              className="p-2 text-slate-400 hover:text-white hover:bg-black-bg rounded-lg transition-colors ml-2"
              title="Add new room"
            >
              <Plus className="w-4 h-4" />
            </button>
            {rooms.length > 1 && (
              <button 
                onClick={handleDeleteRoom}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                title="Delete current room"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {activeRoom && (
            <div className="overflow-x-auto pb-4 bg-black-bg p-4 rounded-b-lg border-x border-b border-black-border -mt-4">
              <div 
                className="grid gap-2 min-w-max" 
                style={{ gridTemplateColumns: `repeat(${activeRoom.width}, minmax(80px, 1fr))` }}
              >
                {Array.from({ length: activeRoom.height }).map((_, y) => (
                  Array.from({ length: activeRoom.width }).map((_, x) => {
                    const displayX = x + 1;
                    const displayY = y + 1;
                    const cellAssignments = activeRoom.assignments.filter(a => a.x === displayX && a.y === displayY);
                    const isDup = cellAssignments.some(a => isDuplicate(a.playerId));
                    const isActive = activeSearchContext?.type === 'cell' && activeSearchContext.x === displayX && activeSearchContext.y === displayY;

                    return (
                      <div 
                        key={`${displayX}-${displayY}`}
                        onClick={() => setActiveSearchContext({ type: 'cell', x: displayX, y: displayY })}
                        className={cn(
                          "h-16 rounded-lg border flex flex-col items-center justify-center p-1 cursor-pointer relative group transition-colors",
                          isActive ? "border-gold bg-gold/5" :
                          cellAssignments.length > 0 
                            ? isDup ? "border-rose-500/50 bg-rose-500/10 text-rose-400" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                            : "border-black-border bg-black-card hover:border-slate-700"
                        )}
                      >
                        <span className="text-[10px] text-slate-600 absolute top-1 left-1 font-bold">
                          {t('guild_dashboard.settings.row', { defaultValue: 'Row' })}:{displayY} {t('guild_dashboard.settings.col', { defaultValue: 'Col' })}:{displayX}
                        </span>
                        {cellAssignments.length > 0 ? (
                          <div className="flex flex-col items-center justify-center w-full px-1 mt-2">
                            <span className="text-xs font-bold text-center truncate w-full" title={cellAssignments.map(a => a.playerName).join(', ')}>
                              {cellAssignments[0].playerName}
                            </span>
                            {cellAssignments.length > 1 && (
                              <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded mt-0.5">
                                +{cellAssignments.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 font-bold">+</span>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          )}

          {/* Search Popup Overlay */}
          {activeSearchContext && (
            <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 fixed inset-0">
              <div className="bg-black-card border border-black-border rounded-xl p-4 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h4 className="text-white font-bold text-sm uppercase tracking-widest">
                    {activeSearchContext.type === 'cell' ? 
                      t('guild_dashboard.settings.assign_player', { 
                        row: `${t('guild_dashboard.settings.row', { defaultValue: 'Row' })}:${activeSearchContext.y}`, 
                        col: `${t('guild_dashboard.settings.col', { defaultValue: 'Col' })}:${activeSearchContext.x}` 
                      }) : ''
                    }
                  </h4>
                  <button onClick={() => { setActiveSearchContext(null); }} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2 space-y-6">
                  {/* Current Players */}
                  {(() => {
                    let currentPlayers: { playerId: string, playerName: string }[] = [];
                    let onRemove: (id: string) => void = () => {};

                    if (activeSearchContext.type === 'cell') {
                      currentPlayers = activeRoom?.assignments.filter(a => a.x === activeSearchContext.x && a.y === activeSearchContext.y) || [];
                      onRemove = removePlayerFromCell;
                    }

                    if (currentPlayers.length === 0) return null;
                    return (
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('guild_dashboard.settings.current_players', { defaultValue: 'Current Bound Players' })}</h5>
                        <div className="flex flex-col gap-2">
                          {currentPlayers.map(a => (
                            <div key={a.playerId} className="flex items-center justify-between p-2 bg-black-bg border border-black-border rounded-lg group/item">
                              <span className="text-sm font-bold text-white">{a.playerName}</span>
                              <button 
                                onClick={() => onRemove(a.playerId)} 
                                className="text-slate-500 hover:text-rose-500 p-1 opacity-50 group-hover/item:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add Player */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('guild_dashboard.settings.add_player', { defaultValue: 'Add Player' })}</h5>
                    <AlbionPlayerSearch
                      guildId={guildId ?? ''}
                      autoFocus
                      onSelect={assignPlayer}
                      isSelected={(player) => {
                        if (activeSearchContext.type !== 'cell') return false;
                        return activeRoom?.assignments.some(a => a.x === activeSearchContext.x && a.y === activeSearchContext.y && a.playerId === player.Id) || false;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}
