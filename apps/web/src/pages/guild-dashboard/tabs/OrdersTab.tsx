import { ShoppingCart } from 'lucide-react';

export function OrdersTab() {
  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Guild Orders</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Manage supply requests</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-black-bg border border-black-border hover:border-gold/30 text-gold text-xs font-bold uppercase rounded-lg transition-colors">
          New Order
        </button>
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-black-bg border border-black-border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black-card border border-black-border rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-tight">Order #{1000 + i}</h3>
                <p className="text-xs text-slate-500 mt-1">Requested: 100x T8 Mounts</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-sky-500/10 text-sky-500 text-[10px] font-black uppercase rounded-lg">In Progress</span>
              <button className="px-4 py-2 bg-black-card border border-black-border hover:border-gold/30 text-gold text-xs font-bold uppercase rounded-lg transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
