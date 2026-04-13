import { useState } from 'react';
import { X, Skull } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DeathRecord, PlayerDeathInfo } from './types';
import { cn, formatFame } from '@/lib/utils';
import { ItemSlot, EquipmentGrid } from './shared/EquipmentDisplay';

export function KillDetailModal({ record, onClose }: { record: DeathRecord, onClose: () => void }) {
  const { t } = useTranslation();
  
  const PlayerBlock = ({ p }: { p: PlayerDeathInfo }) => (
    <div className="flex flex-col items-center">
      <h3 className="text-xl font-bold text-white tracking-tight">{p.name}</h3>
      <p className="text-xs font-bold text-slate-400 mb-4">
        {p.alliance && p.alliance !== 'None' ? `[${p.alliance}] ` : ''}
        {p.guild && p.guild !== 'None' ? p.guild : ''}
      </p>
      <EquipmentGrid eq={p.equipment} />
      <div className="mt-4 px-3 py-1 bg-black-bg border border-black-border rounded-lg">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">IP: </span>
        <span className="text-sm font-bold text-gold">{p.ip}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-black-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative border border-black-border">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black-bg hover:bg-black-bg/80 text-slate-400 hover:text-white rounded-full transition-colors z-10 border border-black-border">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <PlayerBlock p={record.killer} />
            
            <div className="flex flex-col items-center justify-center flex-1 px-4 min-w-[200px]">
              <div className="text-center mb-6">
                <div className="text-4xl font-black text-gold tracking-tighter drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{formatFame(record.fame)}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Fame</div>
              </div>
              <div className="flex flex-col items-center gap-2 mb-6">
                <span className="text-emerald-500 font-black uppercase tracking-widest text-sm">Killer</span>
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-8 sm:w-16 bg-gradient-to-l from-emerald-500/50 to-transparent" />
                  <div className="w-12 h-12 bg-black-bg border border-black-border rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.2)] relative">
                    <div className="absolute inset-0 rounded-full border border-rose-500/20 animate-ping" />
                    <Skull className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="h-[2px] w-8 sm:w-16 bg-gradient-to-r from-rose-500/50 to-transparent" />
                </div>
                <span className="text-rose-500 font-black uppercase tracking-widest text-sm">Victim</span>
              </div>
              <p className="text-sm font-bold text-slate-400 mt-2">
                {(() => {
                  const d = new Date(record.time);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                })()}
              </p>
            </div>

            <PlayerBlock p={record.victim} />
          </div>

          {/* Inventory Section */}
          <div className="border-t border-black-border pt-8">
            <h4 className="text-center text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{t('guild_dashboard.battle_report.victims_inventory')}</h4>
            <div className="grid grid-cols-8 sm:grid-cols-8 gap-1.5 sm:gap-2 max-w-3xl mx-auto">
              {Array.from({ length: 32 }).map((_, i) => {
                const item = record.victim.inventory[i];
                return <ItemSlot key={i} url={item?.url} count={item?.count} empty={!item} large={false} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}