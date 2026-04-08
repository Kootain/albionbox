import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Plus, Search, Globe, Users, CheckCircle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

interface Guild {
  id: string;
  name: string;
  server: string;
  status: 'pending' | 'approved' | 'rejected';
  adminUid: string;
  createdAt: string;
}

export default function Guilds() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGuild, setNewGuild] = useState({ name: '', server: 'East' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await api.guilds.$post({
        json: {
          name: newGuild.name,
          server: newGuild.server,
        }
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setNewGuild({ name: '', server: 'East' });
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
                guild.status === 'approved' 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : guild.status === 'pending'
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {guild.status === 'approved' ? t('common.approved') : guild.status === 'pending' ? t('common.pending') : t('common.rejected')}
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
              onClick={() => setIsModalOpen(false)}
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
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateGuild} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('guilds.guildName')}</label>
                  <input
                    type="text"
                    value={newGuild.name}
                    onChange={(e) => setNewGuild({ ...newGuild, name: e.target.value })}
                    className="w-full bg-black-bg border border-black-border rounded-xl py-3 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                    placeholder="Enter guild name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('guilds.server')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['East', 'West', 'Europe'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewGuild({ ...newGuild, server: s })}
                        className={cn(
                          "py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all",
                          newGuild.server === s 
                            ? "bg-gold text-black border-gold shadow-lg shadow-gold/10" 
                            : "bg-black-bg text-slate-500 border-black-border hover:border-gold/30"
                        )}
                      >
                        {s}
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
