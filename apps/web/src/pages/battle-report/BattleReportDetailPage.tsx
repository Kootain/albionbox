import { useParams, useNavigate } from 'react-router-dom';
import { BattleDetail } from '../guild-dashboard/tabs/battle-report-components/BattleDetail';
import { Shield } from 'lucide-react';

export default function BattleReportDetailPage() {
  const { ids } = useParams();
  const navigate = useNavigate();
  const battleIds = ids ? ids.split(',') : [];

  if (battleIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 uppercase tracking-widest font-bold">
        No battles selected
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6">
      <div className="flex items-center gap-3 mb-6 px-4 sm:px-0">
        <div className="w-10 h-10 bg-gold rounded flex items-center justify-center shadow-lg shadow-gold/20">
          <Shield className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white uppercase">Battle Report</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Shared View</p>
        </div>
      </div>
      <div className="px-0 sm:px-0">
        <BattleDetail 
          battleIds={battleIds} 
          onBack={() => navigate(-1)} 
          isStandalone={true} 
        />
      </div>
    </div>
  );
}
