import { Calendar } from 'lucide-react';

export function ActivitiesTab() {
  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Activities</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Upcoming ZvZ and Gold Chests</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded-lg transition-colors shadow-lg shadow-gold/10">
          Create Event
        </button>
      </div>

      <div className="grid gap-4">
        {['ZvZ CTA - 18:00 UTC', 'Gold Chest Run - 20:00 UTC', 'Fame Farm - 22:00 UTC'].map((title, i) => (
          <div key={i} className="p-4 bg-black-bg border border-black-border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black-card border border-black-border rounded-lg flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">APR</span>
                <span className="text-xl font-bold text-white leading-none mt-1">1{i}</span>
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-tight">{title}</h3>
                <p className="text-xs text-slate-500 mt-1">Mandatory • Discord Voice</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-black-bg flex items-center justify-center text-[10px] font-bold text-white z-10">
                    P{j}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-black-border border-2 border-black-bg flex items-center justify-center text-[10px] font-bold text-slate-400 z-0">
                  +42
                </div>
              </div>
              <button className="px-4 py-2 bg-black-card border border-black-border hover:border-gold/30 text-gold text-xs font-bold uppercase rounded-lg transition-colors">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
