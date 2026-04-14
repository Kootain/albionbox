import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { GuildSelector, GuildInfo } from './components/GuildSelector';
import { GuildStats } from './components/GuildStats';
import { GuildTabs, TabType } from './components/GuildTabs';
import { GameData } from '@albionbox/shared';

// Tabs
import { BattleReportTab } from './tabs/BattleReportTab';
import { MembersTab } from './tabs/MembersTab';
import { RegearTab } from './tabs/RegearTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { AttendanceTab } from './tabs/AttendanceTab';
import { SettingsTab } from './tabs/SettingsTab';

const mockStats = {
  memberCount: 245,
  orderCount: 12,
  activityCount: 4,
  recentLosses: '24.5M'
};

export default function GuildDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'battle-report';
  const initialTicketId = searchParams.get('ticketId') || null;

  const [currentGuild, setCurrentGuild] = useState<GuildInfo>({
    id: 'FSLSXN3LR5y_ENtf5KIcjw',
    name: 'All The Villains',
    allianceName: 'MEPD'
  });
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [pendingRegearBattleIds, setPendingRegearBattleIds] = useState<string[] | null>(null);

  useEffect(() => {
    GameData.loadGameData().catch(console.error);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      prev.set('tab', tab);
      if (tab !== 'regear') {
        prev.delete('ticketId');
      }
      return prev;
    }, { replace: true });
  };

  const handleRegearPreview = (ids: string[]) => {
    setPendingRegearBattleIds(ids);
    handleTabChange('regear');
  };

  const handleTicketIdClear = () => {
    setSearchParams(prev => {
      prev.delete('ticketId');
      return prev;
    }, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'battle-report': return <BattleReportTab guildName={currentGuild.name} guildId={currentGuild.id} onRegearPreview={handleRegearPreview} />;
      case 'members': return <MembersTab />;
      case 'regear': return <RegearTab 
        guildId={currentGuild.id} 
        initialPreviewBattleIds={pendingRegearBattleIds} 
        onPreviewClear={() => setPendingRegearBattleIds(null)} 
        initialTicketId={initialTicketId}
        onTicketIdClear={handleTicketIdClear}
      />;
      case 'orders': return <OrdersTab />;
      case 'activities': return <ActivitiesTab />;
      case 'attendance': return <AttendanceTab />;
      case 'settings': return <SettingsTab guildId={currentGuild.id} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GuildSelector 
          currentGuild={currentGuild} 
          onSelect={setCurrentGuild} 
        />
      </motion.div>

      {/* Stats Dashboard */}
      <GuildStats stats={mockStats} />

      {/* Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-black-card border border-black-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <GuildTabs activeTab={activeTab} onChange={handleTabChange} />
        
        <div className="p-4 md:p-6 bg-black-bg">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
