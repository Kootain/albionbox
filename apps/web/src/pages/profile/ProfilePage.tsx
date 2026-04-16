import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, User as UserIcon, Globe, CheckCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { api } from '../../lib/api';
import { GameAccount, BindingToken } from '@albionbox/shared';

export default function Profile() {
  const { user, profile, refresh } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const [isLinking, setIsLinking] = useState(false);
  const [gameId, setGameId] = useState('');
  const [server, setServer] = useState<'asia' | 'eu' | 'us'>('asia');
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BindingToken[]>([]);

  useEffect(() => {
    if (user) {
      api.game_accounts.$get().then(res => res.json()).then(data => {
        setAccounts(data.accounts);
        setPendingRequests(data.pendingRequests);
      });
    }
  }, [user]);

  const refreshAccounts = async () => {
    const res = await api.game_accounts.$get();
    const { accounts, pendingRequests } = await res.json();
    setAccounts(accounts);
    setPendingRequests(pendingRequests);
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLinking(true);
    try {
      await api.game_accounts.bind_requests.$post({
        json: { username: gameId, server }
      });
      
      setGameId('');
      await refreshAccounts();
    } catch (error) {
      console.error("Error linking account:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteAccount = async (accountIdToDelete: string) => {
    if (!user) return;
    try {
      await api.game_accounts[':id'].$delete({
        param: { id: accountIdToDelete }
      });
      await refreshAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!user) return;
    try {
      await api.game_accounts.bind_requests[':id'].$delete({
        param: { id: requestId }
      });
      await refreshAccounts();
    } catch (error) {
      console.error("Error canceling request:", error);
    }
  };

  const handleSetUserActiveGameAccount = async (accountId: string) => {
    if (!user) return;
    try {
      const res = await api.users.me.active_game_account.$put({
        json: { gameAccountId: accountId }
      });
      if (res.ok) {
        await refresh();
      }
    } catch (error) {
      console.error("Error setting active game account:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{t('common.profile')}</h1>
          <p className="text-slate-500 mt-1 font-bold uppercase tracking-widest text-xs">{t('profile.desc')}</p>
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
              <h2 className="text-xl font-bold text-white truncate w-full">{user?.email || 'User'}</h2>
              <p className="text-gold font-black uppercase tracking-widest text-[10px] mt-1 bg-gold/10 px-3 py-1 rounded-full border border-gold/20">
                {profile?.role || t('common.user')}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">{t('common.status')}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('common.active')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">{t('profile.member_since')}</span>
                <span className="text-slate-300 font-bold">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : t('common.na')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe className="w-3 h-3 text-gold" />
              {t('profile.social_binding')}
            </h3>
            <div className="space-y-3">
              {(() => {
                const kookAccount = user?.thirdPartyAccounts?.find(a => a.provider === 'kook');
                if (kookAccount) {
                  return (
                    <div className="w-full flex items-center justify-between p-3 bg-black-bg border border-emerald-500/30 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center overflow-hidden">
                          {kookAccount.providerAvatar ? (
                            <img src={kookAccount.providerAvatar} alt="Kook avatar" className="w-full h-full object-cover" />
                          ) : (
                            <Shield className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">KOOK</span>
                          <span className="text-[10px] text-slate-400">{kookAccount.providerUsername}</span>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!(await confirm.confirm({ message: t('profile.kook.confirm_unbind', { defaultValue: 'Are you sure you want to unbind your Kook account?' }), danger: true }))) return;
                          try {
                            const res = await api.users.oauth.unbind.$delete({ json: { provider: 'kook' } });
                            if (res.ok) {
                              refresh();
                            } else {
                              const data = await res.json() as any;
                              toast.error(data.error || 'Unbind failed');
                            }
                          } catch (e) {
                            console.error(e);
                            toast.error('Error unbinding');
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <button 
                      onClick={() => {
                        const redirectUri = encodeURIComponent(window.location.origin + '/oauth/kook/callback');
                        const clientId = import.meta.env.VITE_KOOK_CLIENT_ID || '';
                        const authorizeUrl = import.meta.env.VITE_KOOK_AUTHORIZE_URL || 'https://www.kookapp.cn/app/oauth2/authorize';
                        window.location.href = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=get_user_info&state=bind`;
                      }}
                      className="w-full flex items-center justify-between p-3 bg-black-bg border border-black-border rounded-xl hover:border-emerald-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white">KOOK</span>
                      </div>
                      <Plus className="w-4 h-4 text-slate-600 group-hover:text-emerald-500" />
                    </button>
                  );
                }
              })()}
              <button disabled className="w-full flex items-center justify-between p-3 bg-black-bg border border-black-border rounded-xl opacity-50 cursor-not-allowed group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#5865F2]/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#5865F2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Discord</span>
                </div>
                <Plus className="w-4 h-4 text-slate-600" />
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
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('profile.game_accounts')}</h3>
              <span className="text-[10px] font-black text-gold bg-gold/10 px-2 py-1 rounded border border-gold/20 uppercase tracking-widest">
                {accounts.length + pendingRequests.length} / 10
              </span>
            </div>

            <div className="space-y-4 relative z-10">
              {accounts.map((acc, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={acc.id}
                  className="bg-black-bg border border-black-border rounded-xl p-4 flex items-center justify-between hover:border-gold/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black-card border border-black-border rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{acc.username}</h4>
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
                    {acc.status === 'verified' && (
                      <button
                        onClick={() => handleSetUserActiveGameAccount(acc.id)}
                        disabled={user?.activeGameAccountId === acc.id}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          user?.activeGameAccountId === acc.id
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed"
                            : "bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-black cursor-pointer"
                        )}
                      >
                        {user?.activeGameAccountId === acc.id ? t('profile.already_active') : t('profile.set_active')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {pendingRequests.map((req, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (accounts.length + idx) * 0.1 }}
                  key={req.id}
                  className="bg-black-bg border border-amber-500/20 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black-card border border-black-border rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{req.username}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{req.server}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          {t('common.pending')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('profile.verification_token')}</p>
                      <code className="bg-black-card px-2 py-1 rounded border border-black-border text-gold font-mono text-xs font-bold">
                        {req.token}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {accounts.length === 0 && pendingRequests.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-black-border rounded-xl">
                  <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('profile.no_accounts')}</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-black-border">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4">{t('profile.link_new')}</h4>
              <form onSubmit={handleLinkAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder={t('profile.game_id')}
                    className="w-full bg-black-bg border border-black-border rounded-lg py-2.5 px-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <select
                    value={server}
                    onChange={(e) => setServer(e.target.value as 'asia' | 'eu' | 'us')}
                    className="w-full bg-black-bg border border-black-border rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm appearance-none"
                  >
                    <option value="asia">{t('common.east')}</option>
                    <option value="us">{t('common.west')}</option>
                    <option value="eu">{t('common.europe')}</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isLinking || accounts.length + pendingRequests.length >= 10}
                  className="sm:col-span-1 bg-gold hover:bg-gold-hover text-black font-black py-2.5 rounded-lg shadow-lg shadow-gold/10 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('profile.link_btn')}
                </button>
              </form>
              <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                * {t('profile.binding_tip')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
