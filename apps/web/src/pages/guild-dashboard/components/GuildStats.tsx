import { Users, ShoppingCart, Calendar, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StatData {
  memberCount: number;
  orderCount: number;
  activityCount: number;
  recentLosses: string; // e.g. "12.5M"
}

interface GuildStatsProps {
  stats: StatData;
}

export function GuildStats({ stats }: GuildStatsProps) {
  const { t } = useTranslation();

  const statCards = [
    { name: t('guild_dashboard.stats.members'), value: stats.memberCount, icon: Users, color: 'text-emerald-500' },
    { name: t('guild_dashboard.stats.orders'), value: stats.orderCount, icon: ShoppingCart, color: 'text-amber-500' },
    { name: t('guild_dashboard.stats.activities'), value: stats.activityCount, icon: Calendar, color: 'text-sky-500' },
    { name: t('guild_dashboard.stats.recent_losses'), value: stats.recentLosses, icon: TrendingDown, color: 'text-rose-500' },
  ];

  return (
    <div className="grid grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
      {statCards.map((stat, idx) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + idx * 0.1 }}
          className="bg-black-card border border-black-border rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-xl hover:border-gold/30 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl bg-black-bg border border-black-border group-hover:scale-110 transition-transform", stat.color)}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{stat.value}</div>
            <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tighter sm:tracking-widest break-words leading-tight">{stat.name}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
