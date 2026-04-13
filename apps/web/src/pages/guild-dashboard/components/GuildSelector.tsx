import { useState, useEffect } from 'react';
import { Shield, ChevronDown, Plus, Settings, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatFame } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

export interface GuildInfo {
  id: string;
  name: string;
  allianceId?: string;
  allianceName?: string;
  avatar?: string;
  deathFame?: number;
}

interface GuildSelectorProps {
  currentGuild: GuildInfo | null;
  onSelect: (guild: GuildInfo) => void;
}

export function GuildSelector({ currentGuild, onSelect }: GuildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Sync search query with current guild
  useEffect(() => {
    if (currentGuild) {
      setSearchQuery(currentGuild.name);
    }
  }, [currentGuild]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (val.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    
    const timeout = setTimeout(async () => {
      try {
        const res = await api.guilds.test.albion.search.$get({ query: { q: val } });
        if (res.ok) {
          const data = await res.json() as any;
          const sortedGuilds = (data.guilds || []).sort((a: any, b: any) => (b.DeathFame || 0) - (a.DeathFame || 0));
          setSuggestions(sortedGuilds);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleSelectGuild = (g: any) => {
    onSelect({
      id: g.Id,
      name: g.Name,
      allianceId: g.AllianceId,
      allianceName: g.AllianceName,
      deathFame: g.DeathFame
    });
    setIsOpen(false);
    setSearchQuery(g.Name);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-card border border-black-border rounded-2xl p-4 shadow-xl relative z-50">
      <div className="flex-1 w-full relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-2 w-full hover:bg-black-bg rounded-xl transition-colors group text-left"
        >
          <div className="w-10 h-10 bg-black-bg border border-black-border rounded-xl flex-shrink-0 flex items-center justify-center group-hover:border-gold/30 transition-all overflow-hidden">
            {currentGuild?.avatar ? (
              <img src={currentGuild.avatar} alt={currentGuild.name} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-5 h-5 text-gold" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight truncate">
              {currentGuild?.name ? (
                currentGuild.allianceName ? `[${currentGuild.allianceName}] ${currentGuild.name}` : currentGuild.name
              ) : t('guild_dashboard.selector.select_guild')}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('guild_dashboard.selector.current_guild')}</p>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-full sm:w-96 bg-black-card border border-black-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]"
              >
                <div className="p-3 border-b border-black-border bg-black-bg relative">
                  <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={t('guild_dashboard.battle_report.filter_username')}
                    className="w-full pl-10 pr-4 py-2 bg-black-card border border-black-border rounded-xl text-sm text-white focus:outline-none focus:border-gold/50"
                    autoFocus
                  />
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                  {searching ? (
                    <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((g: any) => (
                      <button
                        key={g.Id}
                        onClick={() => handleSelectGuild(g)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group",
                          currentGuild?.id === g.Id 
                            ? "bg-gold/10 text-gold" 
                            : "hover:bg-black-bg text-slate-300 hover:text-white"
                        )}
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold uppercase tracking-tight truncate">{g.Name}</span>
                          {g.AllianceName && <span className="text-[10px] text-slate-500 uppercase tracking-widest">[{g.AllianceName}]</span>}
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs font-bold text-rose-500 group-hover:text-rose-400">{formatFame(g.DeathFame)}</span>
                          <span className="text-[8px] text-slate-500 uppercase tracking-widest">Death Fame</span>
                        </div>
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">No guilds found</div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">Type 2+ characters to search</div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto justify-end">
        <Link
          to="/guilds"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-300 hover:text-white rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{t('guild_dashboard.selector.manage_guilds')}</span>
        </Link>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-hover text-black rounded-xl transition-all shadow-lg shadow-gold/10 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('guild_dashboard.selector.add_guild')}</span>
        </button>
      </div>
    </div>
  );
}
