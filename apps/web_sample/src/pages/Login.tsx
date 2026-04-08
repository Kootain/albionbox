import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Github, Chrome } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let res;
      if (isRegister) {
        res = await api.auth.register.$post({ json: { email, password } });
      } else {
        res = await api.auth.login.$post({ json: { email, password } });
      }
      
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('albion_erp_token', token);
        // Trigger a storage event for useAuth hook
        window.dispatchEvent(new Event('storage'));
        navigate('/');
      } else {
        const { error: errMessage } = await res.json();
        setError(errMessage || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message);
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
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">Albion ERP</h1>
          <p className="text-slate-400 mt-2 text-center text-sm font-bold uppercase tracking-widest">Guild Management System</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-gold transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-lg py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-gold transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black-bg border border-black-border rounded-lg py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all text-sm"
                placeholder="••••••••"
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
            <span className="bg-black-card px-4 text-slate-600">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            disabled
            className="flex items-center justify-center gap-3 bg-black-bg/50 text-slate-700 font-bold py-3 rounded-lg border border-black-border cursor-not-allowed opacity-50 text-xs uppercase tracking-widest"
          >
            <Chrome className="w-4 h-4" />
            <span>Google</span>
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
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
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
