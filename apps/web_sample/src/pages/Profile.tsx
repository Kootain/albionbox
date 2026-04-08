import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, User as UserIcon, Globe, CheckCircle, RefreshCw, Plus, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function Profile() {
  const { user, profile, refresh } = useAuth();
  const { t } = useTranslation();
  const [isLinking, setIsLinking] = useState(false);
  const [gameId, setGameId] = useState('');
  const [server, setServer] = useState('East');

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLinking(true);
    try {
      const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newAccount = {
        gameId,
        server,
        status: 'pending',
        token: newToken
      };
      
      const currentAccounts = profile?.gameAccounts || [];
      await api.users[':uid'].$patch({
        param: { uid: user.uid },
        json: { gameAccounts: [...currentAccounts, newAccount] }
      });
      
      setGameId('');
      await refresh();
    } catch (error) {
      console.error("Error linking account:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteAccount = async (gameIdToDelete: string) => {
    if (!user || !profile) return;
    try {
      const updatedAccounts = profile.gameAccounts?.filter(acc => acc.gameId !== gameIdToDelete) || [];
      await api.users[':uid'].$patch({
        param: { uid: user.uid },
        json: { gameAccounts: updatedAccounts }
      });
      await refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{t('common.profile')}</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-xs">{t('profile.manageAccounts')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-black-bg border-2 border-gold/20 rounded-2xl flex items-center justify-center mb-4 shadow-2xl shadow-gold/5">
                <UserIcon className="w-12 h-12 text-gold" />
              </div>
              <h2 className="text-xl font-bold text-white truncate w-full">{user?.email}</h2>
              <p className="text-gold font-black uppercase tracking-widest text-[10px] mt-1 bg-gold/10 px-3 py-1 rounded-full border border-gold/20">
                {profile?.role || 'User'}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Member Since</span>
                <span className="text-slate-300 font-bold">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe className="w-3 h-3 text-gold" />
              Social Bindings
            </h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-black-bg border border-black-border rounded-xl hover:border-gold/50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#5865F2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">Discord</span>
                </div>
                <Plus className="w-4 h-4 text-slate-600 group-hover:text-gold" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-black-bg border border-black-border rounded-xl hover:border-gold/50 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">KOOK</span>
                </div>
                <Plus className="w-4 h-4 text-slate-600 group-hover:text-gold" />
              </button>
            </div>
          </div>
        </div>

        {/* Game Accounts */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield className="w-32 h-32 text-gold" />
            </div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('profile.gameAccounts')}</h3>
              <span className="text-[10px] font-black text-gold bg-gold/10 px-2 py-1 rounded border border-gold/20 uppercase tracking-widest">
                {profile?.gameAccounts?.length || 0} / 10
              </span>
            </div>

            <div className="space-y-4 relative z-10">
              {profile?.gameAccounts?.map((acc, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={acc.gameId}
                  className="bg-black-bg border border-black-border rounded-xl p-4 flex items-center justify-between hover:border-gold/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black-card border border-black-border rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{acc.gameId}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{acc.server}</span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                          acc.status === 'verified' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}>
                          {acc.status === 'verified' ? t('common.verified') : t('common.pending')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {acc.status === 'pending' && (
                      <div className="text-right mr-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Verification Token</p>
                        <code className="bg-black-card px-2 py-1 rounded border border-black-border text-gold font-mono text-xs font-bold">
                          {acc.token}
                        </code>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDeleteAccount(acc.gameId)}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {(!profile?.gameAccounts || profile.gameAccounts.length === 0) && (
                <div className="text-center py-12 border-2 border-dashed border-black-border rounded-xl">
                  <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No accounts linked yet</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-black-border">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">{t('profile.linkNewAccount')}</h4>
              <form onSubmit={handleLinkAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="Game ID"
                    className="w-full bg-black-bg border border-black-border rounded-lg py-2.5 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <select
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    className="w-full bg-black-bg border border-black-border rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm appearance-none"
                  >
                    <option value="East">Asia (East)</option>
                    <option value="West">Americas (West)</option>
                    <option value="Europe">Europe</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLinking || (profile?.gameAccounts?.length || 0) >= 10}
                  className="sm:col-span-1 bg-gold hover:bg-gold-hover text-black font-black py-2.5 rounded-lg shadow-lg shadow-gold/10 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('profile.linkAccount')}
                </button>
              </form>
              <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                * To verify, enter the token in your in-game signature. Verification is currently manual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
