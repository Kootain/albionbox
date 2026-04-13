import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AttendanceTab() {
  const { t } = useTranslation();

  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('guild_dashboard.attendance.title')}</h2>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('guild_dashboard.attendance.desc')}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black-border">
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.attendance.columns.name')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.attendance.columns.total_ctas')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.attendance.columns.attended')}</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.attendance.columns.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {['PlayerOne', 'HealerPro', 'TankMaster', 'DPSKing'].map((name, i) => {
              const total = 20;
              const attended = 20 - i * 3;
              const rate = ((attended / total) * 100).toFixed(0);
              
              return (
                <tr key={i} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-white">{name}</td>
                  <td className="py-4 px-4 text-sm text-slate-300">{total}</td>
                  <td className="py-4 px-4 text-sm text-emerald-500 font-bold">{attended}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white w-8">{rate}%</span>
                      <div className="w-24 h-1.5 bg-black-bg rounded-full overflow-hidden border border-black-border">
                        <div 
                          className="h-full bg-gold" 
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
