import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Github } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (isRegister) {
        const res = await api.users.register.$post({ json: { email, password } });
        if (res.ok) {
          const data = await res.json();
          setSuccessMsg(data.message || 'Registration successful. Please verify your email.');
        } else {
          const data = await res.json() as { error?: string };
          setError(data.error || 'Registration failed');
        }
      } else {
        const res = await api.users.login.$post({ json: { email, password } });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            await login(data.token);
            navigate('/');
          }
        } else {
          const data = await res.json() as { error?: string };
          setError(data.error || 'Login failed');
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black-bg flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,153,0,0.05),transparent_50%)]" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-black-card border border-black-border rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gold rounded-xl flex items-center justify-center shadow-2xl shadow-gold/20 mb-6">
            <Shield className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">{t('auth.title')}</h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-bold uppercase tracking-widest">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('auth.email')}</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-gold transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-lg py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder={t('auth.email_placeholder')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('auth.password')}</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-gold transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-lg py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder={t('auth.password_placeholder')}
                required
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-bold"
            >
              {error}
            </motion.p>
          )}

          {successMsg && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-emerald-500 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 font-bold"
            >
              {successMsg}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full bg-gold hover:bg-gold-hover text-black font-black py-3 rounded-lg shadow-lg shadow-gold/10 transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
          >
            {isRegister ? t('common.register') : t('common.login')}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black-border"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-black-card px-4 text-slate-600">{t('auth.or_continue_with')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              const redirectUri = encodeURIComponent(window.location.origin + '/oauth/kook/callback');
              const clientId = import.meta.env.VITE_KOOK_CLIENT_ID || '';
              const authorizeUrl = import.meta.env.VITE_KOOK_AUTHORIZE_URL || 'https://www.kookapp.cn/app/oauth2/authorize';
              window.location.href = `${authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=get_user_info`;
            }}
            className="flex items-center justify-center gap-3 bg-black-bg/50 text-slate-300 hover:text-white hover:border-gold transition-colors font-bold py-3 rounded-lg border border-black-border text-xs uppercase tracking-widest"
          >
            <span>Kook</span>
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-3 bg-black-bg/50 text-slate-700 font-bold py-3 rounded-lg border border-black-border cursor-not-allowed opacity-50 text-xs uppercase tracking-widest"
          >
            <Github className="w-4 h-4" />
            <span>Discord</span>
          </button>
        </div>

        <p className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
          {isRegister ? t('auth.already_have_account') : t('auth.dont_have_account')}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-gold hover:text-gold-hover transition-colors"
          >
            {isRegister ? t('common.login') : t('common.register')}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
