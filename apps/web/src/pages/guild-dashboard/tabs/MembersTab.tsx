import { Users } from 'lucide-react';

export function MembersTab() {
  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Members</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Manage guild roster</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-black-bg border border-black-border hover:border-gold/30 text-gold text-xs font-bold uppercase rounded-lg transition-colors">
          Invite Member
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black-border">
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Join Date</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {['PlayerOne', 'HealerPro', 'TankMaster', 'DPSKing'].map((name, i) => (
              <tr key={i} className="border-b border-black-border/50 hover:bg-black-bg/50 transition-colors">
                <td className="py-4 px-4 font-bold text-white">{name}</td>
                <td className="py-4 px-4 text-sm text-slate-300">{i === 0 ? 'Guild Master' : 'Member'}</td>
                <td className="py-4 px-4 text-sm text-slate-500">2024-01-0{i + 1}</td>
                <td className="py-4 px-4">
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-md">Online</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
