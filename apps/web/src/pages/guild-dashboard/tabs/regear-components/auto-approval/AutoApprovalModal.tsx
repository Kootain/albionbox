import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { engine, maxPLevelRule } from './index';
import { Loader2 } from 'lucide-react';
import { RegearRecord, RegearConfig } from '../types';
import { AutoApprovalPoliciesConfig } from '../../../components/AutoApprovalPoliciesConfig';
import { Info } from 'lucide-react';
import { api } from '@/lib/api';

interface AutoApprovalModalProps {
  onClose: () => void;
  onStartApproval: (ruleId: string, options: Record<string, any>, updatedConfig: RegearConfig) => void;
  isProcessing: boolean;
  guildId: string;
  currentConfig: RegearConfig;
  isPreview: boolean;
  ticketId: string;
  onConfigChange: (newConfig: RegearConfig) => void;
}

export function AutoApprovalModal({ onClose, onStartApproval, isProcessing, guildId, currentConfig, isPreview, ticketId, onConfigChange }: AutoApprovalModalProps) {
  const { t } = useTranslation();
  
  // 目前我们只支持这一个规则
  const [selectedRuleId, setSelectedRuleId] = useState(maxPLevelRule.id);
  
  // 本地持有一份配置的副本，支持在弹窗内修改
  const [localConfig, setLocalConfig] = useState<RegearConfig>(currentConfig);

  useEffect(() => {
    setLocalConfig(currentConfig);
  }, [currentConfig]);

  const handleStart = () => {
    onStartApproval(selectedRuleId, {}, localConfig);
  };

  const isReady = localConfig.defaultPLevel !== undefined;

  return (
    <Modal title={t('guild_dashboard.regear_tab.auto_approval.title', { defaultValue: 'Auto Approval Rules' })} onClose={onClose} className="max-w-4xl">
      <div className="space-y-6">
        <p className="text-sm text-slate-400">
          {t('guild_dashboard.regear_tab.auto_approval.desc', { defaultValue: 'Configure rules to automatically approve pending death records.' })}
        </p>

        {!isReady && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl text-sm font-bold">
            {t('guild_dashboard.regear_tab.auto_approval.need_default_plevel', { defaultValue: 'You must configure a Default Regear Level before starting auto approval.' })}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{t('guild_dashboard.regear_tab.auto_approval.local_config_notice')}</p>
        </div>

        <div className="bg-black-bg border border-black-border rounded-xl p-4 max-h-[60vh] overflow-y-auto">
          <AutoApprovalPoliciesConfig 
            guildId={guildId}
            config={localConfig}
            onChange={(newConfig) => {
              setLocalConfig(newConfig);
              onConfigChange(newConfig);
            }}
            onSaveApi={isPreview ? undefined : async (newConfig) => {
              const res = await api.guilds[':guildId'].regear.tickets[':ticketId'].$put({
                param: { guildId, ticketId },
                json: { config: newConfig }
              });
              if (!res.ok) throw new Error('Failed to save ticket config');
            }}
          />
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
            disabled={isProcessing || !selectedRuleId || !isReady}
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
