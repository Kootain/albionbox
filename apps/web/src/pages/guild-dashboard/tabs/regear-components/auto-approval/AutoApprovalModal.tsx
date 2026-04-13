import { useState } from 'react';
import { Modal } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { engine, maxPLevelRule } from './index';
import { Loader2 } from 'lucide-react';
import { RegearRecord, RegearConfig } from '../types';

interface AutoApprovalModalProps {
  onClose: () => void;
  onStartApproval: (ruleId: string, options: Record<string, any>) => void;
  isProcessing: boolean;
}

export function AutoApprovalModal({ onClose, onStartApproval, isProcessing }: AutoApprovalModalProps) {
  const { t } = useTranslation();
  
  // 目前我们只支持这一个规则
  const [selectedRuleId, setSelectedRuleId] = useState(maxPLevelRule.id);
  const [maxPLevel, setMaxPLevel] = useState<number>(9);

  const rules = engine.getAvailableRules();

  const handleStart = () => {
    onStartApproval(selectedRuleId, { maxPLevel });
  };

  return (
    <Modal title={t('guild_dashboard.regear_tab.auto_approval.title', { defaultValue: 'Auto Approval Rules' })} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm text-slate-400">
          {t('guild_dashboard.regear_tab.auto_approval.desc', { defaultValue: 'Configure rules to automatically approve pending death records.' })}
        </p>

        <div className="space-y-4">
          <div className="bg-black-bg border border-black-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="approval_rule" 
                  value={maxPLevelRule.id} 
                  checked={selectedRuleId === maxPLevelRule.id}
                  onChange={() => setSelectedRuleId(maxPLevelRule.id)}
                  className="w-4 h-4 text-gold border-black-border bg-black-card focus:ring-gold focus:ring-offset-black-bg"
                />
                <span className="font-bold text-white">
                  {t('guild_dashboard.regear_tab.auto_approval.max_plevel_title')} <span className="text-sm font-bold text-slate-400"> P &lt;= </span>
                  <input 
                    type="number" 
                    min={0}
                    max={20}
                    value={maxPLevel}
                    onChange={(e) => setMaxPLevel(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 bg-black-card border border-black-border rounded-lg text-white font-bold focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50"
                  />
                </span>
              </label>
            </div>
            
            {selectedRuleId === maxPLevelRule.id && (
              <div className="pl-7 space-y-2">
                <p className="text-xs text-slate-500">
                  {t('guild_dashboard.regear_tab.auto_approval.max_plevel_desc', { n: maxPLevel })}
                </p>
                
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-black-border flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-2 bg-black-bg hover:bg-black-card border border-black-border text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button 
            onClick={handleStart}
            disabled={isProcessing || !selectedRuleId}
            className="flex items-center gap-2 px-6 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('guild_dashboard.regear_tab.auto_approval.start', { defaultValue: 'Start Approval' })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
