import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AlbionSearchResultPlayer } from '@albionbox/shared';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { RegearConfig } from '../tabs/regear-components/types';

export interface AutoApprovalPoliciesConfigProps {
  guildId: string;
  config: RegearConfig;
  onChange: (newConfig: RegearConfig) => void;
  onSaveApi?: (newConfig: RegearConfig) => Promise<void>;
}

export function AutoApprovalPoliciesConfig({
  guildId,
  config,
  onChange,
  onSaveApi,
}: AutoApprovalPoliciesConfigProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();

  const defaultPLevel = config.defaultPLevel;
  const noRegearPlayers = config.policies?.noRegear?.players || [];
  const levelGroups = config.policies?.levelGroups || [];

  // Search state for policies
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlbionSearchResultPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchContext, setActiveSearchContext] = useState<{ type: 'noRegear' } | { type: 'levelGroup', groupId: string } | null>(null);

  const handleSave = async (newConfig: RegearConfig) => {
    onChange(newConfig); // Optimistic update
    
    if (onSaveApi) {
      try {
        await onSaveApi(newConfig);
        toast.success(t('common.saved', { defaultValue: 'Saved successfully!' }));
      } catch (err) {
        console.error(err);
        toast.error(t('common.save_failed', { defaultValue: 'Failed to save settings' }));
      }
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !guildId) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.guilds[':id'].albion.search.$get({ param: { id: guildId }, query: { q: query } });
      if (res.ok) {
        const data = await res.json() as any;
        setSearchResults(data.players || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const assignPlayer = (player: AlbionSearchResultPlayer) => {
    if (!activeSearchContext) return;
    
    if (activeSearchContext.type === 'noRegear') {
      const isAlreadyIn = noRegearPlayers.some(p => p.id === player.Id);
      if (!isAlreadyIn) {
        const newPlayers = [...noRegearPlayers, { id: player.Id, name: player.Name }];
        handleSave({ ...config, policies: { ...config.policies, noRegear: { players: newPlayers }, levelGroups } });
      }
    } else if (activeSearchContext.type === 'levelGroup') {
      const groupIdx = levelGroups.findIndex(g => g.id === activeSearchContext.groupId);
      if (groupIdx !== -1) {
        const isAlreadyIn = levelGroups[groupIdx].players.some(p => p.id === player.Id);
        if (!isAlreadyIn) {
          const newGroups = [...levelGroups];
          newGroups[groupIdx] = {
            ...newGroups[groupIdx],
            players: [...newGroups[groupIdx].players, { id: player.Id, name: player.Name }]
          };
          handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
        }
      }
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-black-bg border border-black-border rounded-xl p-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-2">{t('guild_dashboard.settings.policies.default_level', { defaultValue: 'Default Regear Level (P-Level)' })}</h4>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="0"
            max="20"
            value={defaultPLevel ?? ''}
            onChange={e => {
              const val = e.target.value === '' ? undefined : Number(e.target.value);
              handleSave({ ...config, defaultPLevel: val });
            }}
            placeholder="No default"
            className="w-24 px-3 py-2 bg-black-card border border-black-border rounded-lg text-white font-bold focus:outline-none focus:border-gold/50"
          />
        </div>
      </div>

      {/* No Regear Policy */}
      <div className="bg-black-bg border border-black-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-rose-500 uppercase tracking-widest">{t('guild_dashboard.settings.policies.no_regear', { defaultValue: 'Excluded from Regear' })}</h4>
            <p className="text-xs text-slate-500 mt-1">{t('guild_dashboard.settings.policies.no_regear_desc', { defaultValue: 'Players in this list will be automatically excluded.' })}</p>
          </div>
          <button 
            onClick={() => setActiveSearchContext({ type: 'noRegear' })}
            className="flex items-center gap-2 px-3 py-1.5 bg-black-card hover:bg-black-card/80 text-slate-400 hover:text-white border border-black-border rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('guild_dashboard.settings.add_player', { defaultValue: 'Add Player' })}
          </button>
        </div>
        
        {noRegearPlayers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {noRegearPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-bold group">
                {p.name}
                <button 
                  onClick={() => {
                    const newPlayers = noRegearPlayers.filter(x => x.id !== p.id);
                    handleSave({ ...config, policies: { ...config.policies, noRegear: { players: newPlayers }, levelGroups } });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-bold uppercase tracking-widest">{t('common.empty', { defaultValue: 'No players added' })}</div>
        )}
      </div>

      {/* Level Groups Policy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">{t('guild_dashboard.settings.policies.level_groups', { defaultValue: 'Custom Level Groups' })}</h4>
            <p className="text-xs text-slate-500 mt-1">{t('guild_dashboard.settings.policies.level_groups_desc', { defaultValue: "Players in these groups will be automatically approved if their equipment meets the group's max P-Level." })}</p>
          </div>
          <button 
            onClick={() => {
              const newGroups = [...levelGroups, { id: Math.random().toString(36).substring(2, 9), name: `Group ${levelGroups.length + 1}`, maxPLevel: defaultPLevel ?? 8, players: [] }];
              handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('guild_dashboard.settings.policies.add_group', { defaultValue: 'Add Group' })}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {levelGroups.map((group, idx) => (
            <div key={group.id} className="bg-black-bg border border-black-border rounded-xl p-4 flex flex-col relative group/card">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2 flex-1 pr-8">
                  <input
                    type="text"
                    value={group.name}
                    onChange={e => {
                        const newGroups = [...levelGroups];
                        newGroups[idx].name = e.target.value;
                        onChange({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
                      }}
                      onBlur={() => {
                        handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups } });
                      }}
                    placeholder="Group Name"
                    className="bg-transparent border-b border-transparent hover:border-black-border focus:border-emerald-500 text-sm font-bold text-white focus:outline-none w-full transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max P-Level:</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={group.maxPLevel}
                      onChange={e => {
                          const newGroups = [...levelGroups];
                          newGroups[idx].maxPLevel = Number(e.target.value);
                          handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
                        }}
                      className="w-16 bg-black-card border border-black-border rounded px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    {defaultPLevel !== undefined && group.maxPLevel <= defaultPLevel && (
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title={t('guild_dashboard.settings.policies.conflict_warning', { defaultValue: 'Group level is <= default level. This may conflict with default rules.' })}>
                        ! {t('guild_dashboard.settings.policies.conflict_short', { defaultValue: 'Conflict' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {group.players.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {group.players.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 bg-black-card border border-black-border text-slate-300 rounded text-[10px] font-bold group/player">
                        {p.name}
                        <button 
                          onClick={() => {
                            const newGroups = [...levelGroups];
                            newGroups[idx].players = newGroups[idx].players.filter(x => x.id !== p.id);
                            handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
                          }}
                          className="opacity-0 group-hover/player:opacity-100 transition-opacity hover:text-rose-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{t('common.empty', { defaultValue: 'No players added' })}</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-black-border flex justify-between items-center">
                <button 
                  onClick={() => setActiveSearchContext({ type: 'levelGroup', groupId: group.id })}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  + {t('guild_dashboard.settings.add_player', { defaultValue: 'Add Player' })}
                </button>
                <button 
                  onClick={async () => {
                    if (await confirm.confirm({ message: t('guild_dashboard.settings.confirm_delete_group', { defaultValue: 'Are you sure you want to delete this group?' }), danger: true })) {
                      const newGroups = levelGroups.filter(g => g.id !== group.id);
                      handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
                    }
                  }}
                  className="text-slate-500 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Popup Overlay */}
      {activeSearchContext && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 fixed inset-0">
          <div className="bg-black-card border border-black-border rounded-xl p-4 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">
                {activeSearchContext.type === 'noRegear' ?
                  t('guild_dashboard.settings.policies.no_regear_add', { defaultValue: 'Add to No Regear' }) :
                  t('guild_dashboard.settings.policies.level_group_add', { defaultValue: 'Add to Group' })
                }
              </h4>
              <button onClick={() => { setActiveSearchContext(null); setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {/* Current Players */}
              {(() => {
                let currentPlayers: { playerId: string, playerName: string }[] = [];
                let onRemove: (id: string) => void = () => {};

                if (activeSearchContext.type === 'noRegear') {
                  currentPlayers = noRegearPlayers.map(p => ({ playerId: p.id, playerName: p.name }));
                  onRemove = (id: string) => {
                    const newPlayers = noRegearPlayers.filter(p => p.id !== id);
                    handleSave({ ...config, policies: { ...config.policies, noRegear: { players: newPlayers }, levelGroups } });
                  };
                } else if (activeSearchContext.type === 'levelGroup') {
                  const group = levelGroups.find(g => g.id === activeSearchContext.groupId);
                  if (group) {
                    currentPlayers = group.players.map(p => ({ playerId: p.id, playerName: p.name }));
                    onRemove = (id: string) => {
                      const newGroups = levelGroups.map(g => g.id === group.id ? { ...g, players: g.players.filter(p => p.id !== id) } : g);
                      handleSave({ ...config, policies: { ...config.policies, noRegear: { players: noRegearPlayers }, levelGroups: newGroups } });
                    };
                  }
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
                <div className="relative mb-4">
                  <input
                    type="text"
                    autoFocus
                    placeholder={t('guild_dashboard.settings.search', { defaultValue: 'Search player by name...' })}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full bg-black-bg border border-black-border rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold/50"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  {isSearching && <Loader2 className="w-4 h-4 text-gold animate-spin absolute right-3 top-3" />}
                </div>

                <div className="space-y-2">
                  {searchResults.map(player => {
                    let isAssigned = false;
                    if (activeSearchContext.type === 'noRegear') {
                      isAssigned = noRegearPlayers.some(p => p.id === player.Id);
                    } else if (activeSearchContext.type === 'levelGroup') {
                      const group = levelGroups.find(g => g.id === activeSearchContext.groupId);
                      isAssigned = group?.players.some(p => p.id === player.Id) || false;
                    }

                    return (
                      <div 
                        key={player.Id} 
                        onClick={() => !isAssigned && assignPlayer(player)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg transition-colors",
                          isAssigned 
                            ? "bg-emerald-500/10 border border-emerald-500/20 cursor-default" 
                            : "hover:bg-black-bg border border-transparent cursor-pointer group"
                        )}
                      >
                        <div>
                          <div className={cn("text-sm font-bold", isAssigned ? "text-emerald-500" : "text-white")}>{player.Name}</div>
                          <div className="text-xs text-slate-500 font-bold">{player.GuildName || 'No Guild'}</div>
                        </div>
                        {isAssigned ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <button className="text-xs font-bold text-gold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</button>
                        )}
                      </div>
                    );
                  })}
                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="text-center text-sm font-bold uppercase tracking-widest text-slate-500 py-4">No players found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}