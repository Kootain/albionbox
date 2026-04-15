import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export type TabType =
  | 'battle-report'
  | 'members'
  | 'regear'
  | 'regear-approval'
  | 'orders'
  | 'activities'
  | 'attendance'
  | 'settings';

interface GuildTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function GuildTabs({ activeTab, onChange }: GuildTabsProps) {
  const { t } = useTranslation();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'battle-report', label: t('guild_dashboard.tabs.battle_report') },
    { id: 'members', label: t('guild_dashboard.tabs.members') },
    { id: 'regear', label: t('guild_dashboard.tabs.regear') },
    { id: 'regear-approval', label: t('guild_dashboard.tabs.regear_approval', { defaultValue: 'Regear Approval' }) },
    { id: 'orders', label: t('guild_dashboard.tabs.orders') },
    { id: 'activities', label: t('guild_dashboard.tabs.activities') },
    { id: 'attendance', label: t('guild_dashboard.tabs.attendance') },
    { id: 'settings', label: t('guild_dashboard.tabs.settings', { defaultValue: 'Settings' }) },
  ];

  return (
    <div className="flex overflow-x-auto border-b border-black-border scrollbar-hide">
      <div className="flex space-x-2 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-3 text-sm font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-all",
              activeTab === tab.id
                ? "border-gold text-gold"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
