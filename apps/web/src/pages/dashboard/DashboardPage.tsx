import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Sword, Users, TrendingUp, Clock, ChevronRight, ExternalLink, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    guilds: 0,
    sessions: 0,
    requests: 0,
    pending: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [guildsRes] = await Promise.all([
          api.guilds.$get()
        ]);
        
        if (guildsRes.ok) {
          const guilds = await guildsRes.json();
          setStats({
            guilds: guilds.length,
            sessions: 0,
            requests: 0,
            pending: guilds.filter((g: { status: string }) => g.status === 'pending').length
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { name: t('common.guilds'), value: stats.guilds, icon: Shield, color: 'text-gold' },
    { name: t('common.regear'), value: stats.sessions, icon: Sword, color: 'text-rose-500' },
    { name: t('common.members'), value: '0', icon: Users, color: 'text-emerald-500' },
    { name: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-black-card border border-black-border rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Shield className="w-64 h-64 text-gold" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-gold font-black uppercase tracking-[0.3em] text-[10px] block">Welcome Back</span>
              <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Online
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase leading-none mb-6">
              {t('dashboard.welcome')}, <span className="text-gold">{user?.email?.split('@')[0] || user?.thirdPartyAccounts?.[0]?.providerUsername || 'Player'}</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
              {t('dashboard.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-gold hover:bg-gold-hover text-black font-black px-8 py-4 rounded-xl shadow-lg shadow-gold/10 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center gap-2">
                <Sword className="w-4 h-4" />
                Quick Regear
              </button>
              <button className="bg-black-bg hover:bg-black-border text-white font-black px-8 py-4 rounded-xl border border-black-border transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Guild Portal
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="bg-black-card border border-black-border rounded-2xl p-6 shadow-xl hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl bg-black-bg border border-black-border group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-800" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.name}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-gold" />
              Recent Activity
            </h2>
            <button className="text-gold hover:text-gold-hover text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors">
              View All
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-black-card border border-black-border rounded-3xl overflow-hidden shadow-xl">
            <div className="divide-y divide-black-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-black-bg/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black-bg border border-black-border rounded-xl flex items-center justify-center group-hover:border-gold/30 transition-all">
                      <Sword className="w-5 h-5 text-slate-500 group-hover:text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">New Regear Request</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">ZvZ Session #42 • 2 hours ago</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-600 hover:text-gold transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions / Info */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight px-2">System Status</h2>
          <div className="bg-black-card border border-black-border rounded-3xl p-6 shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">API Status</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>
              <div className="w-full bg-black-bg h-1.5 rounded-full overflow-hidden border border-black-border">
                <div className="bg-gold h-full w-[98%]" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server Load</span>
                <span className="text-[10px] font-black text-gold uppercase tracking-widest">Low</span>
              </div>
              <div className="w-full bg-black-bg h-1.5 rounded-full overflow-hidden border border-black-border">
                <div className="bg-gold h-full w-[12%]" />
              </div>
            </div>

            <div className="pt-6 border-t border-black-border">
              <div className="bg-black-bg rounded-2xl p-4 border border-black-border">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  Albion ERP is currently in beta. Please report any bugs to the administration.
                </p>
              </div>
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
