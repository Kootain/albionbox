import { RegearOrder } from './types';
import { format } from 'date-fns';
import { Clock, Shield, CheckCircle, ChevronRight, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RegearListProps {
  orders: RegearOrder[];
  onSelectOrder: (orderId: string) => void;
  onCreatePreview: () => void;
  onDeleteOrder: (orderId: string) => void;
}

export function RegearList({ orders, onSelectOrder, onCreatePreview, onDeleteOrder }: RegearListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('guild_dashboard.regear_tab.title')}</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('guild_dashboard.regear_tab.desc')}</p>
        </div>
        <button 
          onClick={onCreatePreview}
          className="px-4 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
        >
          {t('guild_dashboard.regear_tab.create_btn')}
        </button>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            className="group p-5 bg-black-bg border border-black-border hover:border-gold/30 rounded-xl cursor-pointer transition-all relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 left-0 w-1 h-full",
              order.status === 'active' ? "bg-amber-500" : "bg-emerald-500"
            )} />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2">
              {/* Info Section */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider flex items-center gap-1",
                    order.status === 'active' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {order.status === 'active' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {order.status === 'active' ? t('guild_dashboard.regear_tab.status.active') : t('guild_dashboard.regear_tab.status.completed')}
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {format(new Date(order.startTime), 'yyyy/MM/dd HH:mm')} - {format(new Date(order.endTime), 'HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {t('guild_dashboard.regear_tab.order_prefix_list', { defaultValue: 'Regear Session: ' })}
                    <span className="text-gold">{order.battleIds?.length || 0}</span> 
                    <span className="text-slate-400 font-bold ml-1 text-sm uppercase tracking-widest">{t('guild_dashboard.regear_tab.battles_suffix', { defaultValue: 'Battles' })}</span>
                  </h3>
                </div>
              </div>

              {/* Stats Section */}
              <div className="flex flex-wrap gap-4 flex-1 lg:justify-end">
                <StatBadge label={t('guild_dashboard.regear_tab.stats.total_deaths')} value={order.stats.totalDeaths} color="slate" />
                {/* <StatBadge label={t('guild_dashboard.regear_tab.stats.excluded')} value={order.stats.excludedRegear} color="slate" /> */}
                {/* <StatBadge label={t('guild_dashboard.regear_tab.stats.rejected')} value={order.stats.rejectedRegear} color="rose" /> */}
                <StatBadge label={t('guild_dashboard.regear_tab.stats.pending_review')} value={order.stats.pendingReview} color="amber" />
                <StatBadge label={t('guild_dashboard.regear_tab.stats.pending_regear')} value={order.stats.pendingRegear} color="rose" />
                <StatBadge label={t('guild_dashboard.regear_tab.stats.completed')} value={order.stats.completedRegear} color="emerald" />
              </div>

              {/* Action Section */}
              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteOrder(order.id);
                  }}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-black-card hover:bg-rose-500/10 transition-colors group/delete"
                  title={t('common.delete', { defaultValue: 'Delete' })}
                >
                  <Trash2 className="w-4 h-4 text-slate-500 group-hover/delete:text-rose-500 transition-colors" />
                </button>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black-card group-hover:bg-gold/10 transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-gold transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: 'slate' | 'amber' | 'rose' | 'emerald' | 'gray' }) {
  const colors = {
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <div className={cn("px-3 py-1.5 rounded-lg border flex flex-col items-center justify-center min-w-[4rem]", colors[color])}>
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}
