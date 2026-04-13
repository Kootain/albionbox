import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Plus, Search, Globe, Users, CheckCircle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

interface Guild {
  id: string;
  name: string;
  server: string;
  status: 'pending' | 'active' | 'rejected';
  ownerId: string;
  createdAt: string;
}

interface AlbionSearchResultGuild {
  Id: string;
  Name: string;
  AllianceId: string;
  AllianceName: string;
  KillFame: number | null;
  DeathFame: number;
}

export default function Guilds() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGuild, setNewGuild] = useState<{ id: string, name: string, server: 'asia' | 'eu' | 'us' }>({ id: '', name: '', server: 'asia' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlbionSearchResultGuild[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGuilds = async () => {
    try {
      const res = await api.guilds.$get();
      if (res.ok) {
        setGuilds(await res.json());
      }
    } catch (error) {
      console.error("Error fetching guilds:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.guilds.test.albion.search.$get({
          query: { q: searchQuery, server: newGuild.server }
        });
        if (res.ok) {
          const data = await res.json();
          let results = data.guilds || [];
          
          // Sort: exact name match first, then by deathFame descending
          results = results.sort((a: AlbionSearchResultGuild, b: AlbionSearchResultGuild) => {
            const aExact = a.Name.toLowerCase() === searchQuery.toLowerCase();
            const bExact = b.Name.toLowerCase() === searchQuery.toLowerCase();
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Both exact or both not exact, sort by deathFame descending
            return (b.DeathFame || 0) - (a.DeathFame || 0);
          });
          
          setSearchResults(results.slice(0, 10)); // limit to 10
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching guilds:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, newGuild.server]);

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate if a valid guild id has been selected from the suggestions
    if (!newGuild.id) {
      alert(t('guilds.pleaseSelectGuildFromSuggestions'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await api.guilds.$post({
        json: {
          id: newGuild.id,
          name: newGuild.name,
          server: newGuild.server,
        }
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setNewGuild({ id: '', name: '', server: 'asia' });
        setSearchQuery('');
        setSearchResults([]);
        await fetchGuilds();
      }
    } catch (error) {
      console.error("Error creating guild:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{t('common.guilds')}</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-xs">{t('guilds.manageGuilds')}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gold hover:bg-gold-hover text-black font-black px-6 py-3 rounded-xl shadow-lg shadow-gold/10 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('guilds.registerGuild')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : guilds.map((guild, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={guild.id}
            className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl hover:border-gold/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="w-24 h-24 text-gold" />
            </div>

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="w-12 h-12 bg-black-bg border border-black-border rounded-xl flex items-center justify-center shadow-2xl shadow-gold/5">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                guild.status === 'active' 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : guild.status === 'pending'
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {guild.status === 'active' ? t('common.active') : guild.status === 'pending' ? t('common.pending') : t('common.rejected')}
              </span>
            </div>

            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-gold transition-colors">{guild.name}</h3>
              <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {guild.server}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  0 {t('common.members')}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-black-border flex items-center justify-between relative z-10">
              <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Created {new Date(guild.createdAt).toLocaleDateString()}
              </div>
              <button className="text-gold hover:text-gold-hover text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors">
                View Details
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}

        {!loading && guilds.length === 0 && (
          <div className="col-span-full text-center py-20 bg-black-card/50 border-2 border-dashed border-black-border rounded-3xl">
            <Shield className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No guilds registered yet</p>
          </div>
        )}
      </div>

      {/* Register Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-black-card border border-black-border w-full max-w-lg rounded-3xl p-8 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{t('guilds.registerGuild')}</h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateGuild} className="space-y-6">
                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('guilds.guildName')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setNewGuild({ ...newGuild, name: e.target.value, id: '' });
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                      placeholder="Enter guild name"
                      required
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 text-gold animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {showSuggestions && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-black-card border border-black-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                      >
                        {searchResults.map((guild) => (
                          <button
                            key={guild.Id}
                            type="button"
                            onClick={() => {
                              setSearchQuery(guild.Name);
                              setNewGuild({ ...newGuild, id: guild.Id, name: guild.Name });
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-black-border last:border-0"
                          >
                            <div>
                              <div className="text-sm font-bold text-white group-hover:text-gold transition-colors">{guild.Name}</div>
                              {guild.AllianceName && (
                                <div className="text-xs text-slate-500">[{guild.AllianceName}]</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Death Fame</div>
                              <div className="text-xs font-mono text-rose-400">{guild.DeathFame?.toLocaleString()}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('guilds.server')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'asia', label: 'East' },
                      { value: 'us', label: 'West' },
                      { value: 'eu', label: 'Europe' }
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setNewGuild({ ...newGuild, server: s.value as 'asia' | 'eu' | 'us' })}
                        className={cn(
                          "py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all",
                          newGuild.server === s.value 
                            ? "bg-gold text-black border-gold shadow-lg shadow-gold/10" 
                            : "bg-black-bg text-slate-500 border-black-border hover:border-gold/30"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gold hover:bg-gold-hover text-black font-black py-4 rounded-xl shadow-lg shadow-gold/20 transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {t('guilds.registerGuild')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
