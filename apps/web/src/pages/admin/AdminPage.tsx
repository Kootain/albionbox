import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, CheckCircle, XCircle, RefreshCw, User as UserIcon, Globe, Mail, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {BindingToken} from '@albionbox/shared'

interface PendingGuild {
  id: string;
  name: string;
  server: string;
  ownerId: string;
  status: string;
  createdAt: string;
}

interface PendingBindingWithEmail extends BindingToken {
  email: string | null;
}

export default function Admin() {
  const { user, profile, loading, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [pendingGuilds, setPendingGuilds] = useState<PendingGuild[]>([]);
  const [pendingBindings, setPendingBindings] = useState<PendingBindingWithEmail[]>([]);
  const [activeTab, setActiveTab] = useState<'guilds' | 'bindings'>('guilds');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user || !isAdmin) return;
    try {
      const [guildsRes, bindingsRes] = await Promise.all([
        api.admin.guild_reviews.$get(),
        api.admin.binding_reviews.$get()
      ]);
      
      if (guildsRes.ok) setPendingGuilds(await guildsRes.json());
      if (bindingsRes.ok) setPendingBindings(await bindingsRes.json());
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-black-bg text-gold">Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/" />;

  const handleApproveGuild = async (guildId: string) => {
    const albionGuildId = window.prompt(t('admin.prompt_approve_guild'));
    if (!albionGuildId) return;

    setIsProcessing(guildId);
    try {
      const res = await api.admin.guild_reviews[':id'].approve.$post({
        param: { id: guildId },
        json: { albionGuildId }
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Error approving guild:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectGuild = async (guildId: string) => {
    const note = window.prompt(t('admin.prompt_reject'));
    setIsProcessing(guildId);
    try {
      const res = await api.admin.guild_reviews[':id'].reject.$post({
        param: { id: guildId },
        json: { note: note || undefined }
      });
      if (res.ok) await fetchData();
    } catch (error) {
      console.error("Error rejecting guild:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleApproveBinding = async (binding: PendingBindingWithEmail) => {
    const processId = `${binding.userId}-${binding.username}`;
    const promptText = t('admin.prompt_approve_binding', { username: binding.username });
    const token = window.prompt(promptText);

    setIsProcessing(processId);
    try {
      const updateRes = await api.admin.binding_reviews[':id'].approve.$post({
        param: { id: binding.id },
        json: { token }
      });
      
      if (updateRes.ok) await fetchData();
    } catch (error) {
      console.error("Error approving binding:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectBinding = async (binding: PendingBindingWithEmail) => {
    const processId = `${binding.userId}-${binding.username}`;
    const note = window.prompt(t('admin.prompt_reject'));
    
    setIsProcessing(processId);
    try {
      const updateRes = await api.admin.binding_reviews[':id'].reject.$post({
        param: { id: binding.id },
        json: { note: note || undefined }
      });
      
      if (updateRes.ok) await fetchData();
    } catch (error) {
      console.error("Error rejecting binding:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{t('common.admin')}</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-xs">{t('admin.desc')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-black-card border border-black-border rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('guilds')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'guilds' ? "bg-gold text-black shadow-lg shadow-gold/10" : "text-slate-500 hover:text-slate-300"
          )}
        >
          {t('admin.pending_guilds')} ({pendingGuilds.length})
        </button>
        <button
          onClick={() => setActiveTab('bindings')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'bindings' ? "bg-gold text-black shadow-lg shadow-gold/10" : "text-slate-500 hover:text-slate-300"
          )}
        >
          {t('admin.pending_bindings')} ({pendingBindings.length})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="wait">
          {activeTab === 'guilds' ? (
            <motion.div
              key="guilds"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {pendingGuilds.map((guild) => (
                <div key={guild.id} className="bg-black-card border border-black-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gold/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black-bg border border-black-border rounded-xl flex items-center justify-center shadow-2xl shadow-gold/5">
                      <Shield className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{guild.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {guild.server}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(guild.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApproveGuild(guild.id)}
                      disabled={isProcessing === guild.id}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      {isProcessing === guild.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      {t('common.approved')}
                    </button>
                    <button 
                      onClick={() => handleRejectGuild(guild.id)}
                      disabled={isProcessing === guild.id}
                      className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <XCircle className="w-3 h-3" />
                      {t('common.rejected')}
                    </button>
                  </div>
                </div>
              ))}
              {pendingGuilds.length === 0 && (
                <div className="text-center py-20 bg-black-card/50 border-2 border-dashed border-black-border rounded-3xl">
                  <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('admin.no_pending_guilds')}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="bindings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {pendingBindings.map((binding) => (
                <div key={`${binding.userId}-${binding.username}`} className="bg-black-card border border-black-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gold/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black-bg border border-black-border rounded-xl flex items-center justify-center shadow-2xl shadow-gold/5">
                      <UserIcon className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{binding.username}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {binding.server}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {binding.email || t('common.na')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApproveBinding(binding)}
                        disabled={isProcessing === `${binding.userId}-${binding.username}`}
                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        {isProcessing === `${binding.userId}-${binding.username}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {t('common.verified')}
                      </button>
                      <button 
                        onClick={() => handleRejectBinding(binding)}
                        disabled={isProcessing === `${binding.userId}-${binding.username}`}
                        className="bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <XCircle className="w-3 h-3" />
                        {t('common.rejected')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingBindings.length === 0 && (
                <div className="text-center py-20 bg-black-card/50 border-2 border-dashed border-black-border rounded-3xl">
                  <UserIcon className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('admin.no_pending_bindings')}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
