import { RegearOrderDetail, RegearRecord, RegearConfig, } from './types';
import { format } from 'date-fns';
import { ArrowLeft, Clock, ShieldAlert, CheckCircle, Package, Settings2, Sword, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, Trash2 } from 'lucide-react';
import { cn, formatFame, getAlbionItemUrl } from '@/lib/utils';
import { AlbionOfficialEvent, GameData } from '@albionbox/shared';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RegearRelatedBattles } from './RegearRelatedBattles';
import { api } from '@/lib/api';
import { getBaseItemId, calculatePLevel } from './utils';
import { AutoApprovalModal } from './auto-approval/AutoApprovalModal';
import { engine } from './auto-approval';
import { KillDetailModal } from '../battle-report-components/KillDetailModal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

interface ChestRoom {
  id: string;
  name: string;
  width: number;
  height: number;
  assignments: {x: number, y: number, playerId: string, playerName: string}[];
}

interface RegearDetailProps {
  detail: RegearOrderDetail;
  onBack: () => void;
  guildId: string;
  isPreview?: boolean;
  onCreateFromPreview?: () => void;
  onDelete?: (id: string) => void;
  onDeleteRecord?: (id: string) => void;
}

function getItemDisplayName(itemType: string): string {
  if (!itemType) return '';
  if (!GameData.isLoaded()) {
    console.log('GameData not loaded, using base item ID:', getBaseItemId(itemType));
    return getBaseItemId(itemType);
  } 
  
  return GameData.getItemNameByUniqueName(itemType);
}

export function RegearDetail({ detail, onBack, guildId, isPreview, onCreateFromPreview, onDelete, onDeleteRecord }: RegearDetailProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  
  // Re-render when i18n language changes to update game-data text
  useMemo(() => {
    GameData.setLanguage(i18n.language.startsWith('zh') ? 'ZH-CN' : 'EN-US');
  }, [i18n.language]);

  const { order, config: initialConfig, records: initialRecords } = detail;
  
  const [config, setConfig] = useState<RegearConfig>(initialConfig);
  const [records, setRecords] = useState<RegearRecord[]>(initialRecords);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBattlesModal, setShowBattlesModal] = useState(false);
  const [showAutoApproveModal, setShowAutoApproveModal] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);
  const [equipmentGroupSize, setEquipmentGroupSize] = useState<number>(0);
  const [detailEventRecord, setDetailEventRecord] = useState<AlbionOfficialEvent | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [recordsPage, setRecordsPage] = useState(1);
  const RECORDS_PER_PAGE = 10;
  const ALL_STATUSES = ['pending_review', 'pending_regear', 'rejected', 'completed', 'excluded'] as const;
  const [statusFilter, setStatusFilter] = useState<RegearRecord['status'][]>([...ALL_STATUSES]);
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<RegearRecord['status'][]>(['pending_review', 'pending_regear', 'completed']);
  const [sortConfig, setSortConfig] = useState<{ key: 'playerName' | 'ip' | 'deathFame' | 'chest', direction: 'asc' | 'desc', chestMode?: 'row' | 'col' }>({ key: 'chest', direction: 'asc', chestMode: 'row' });
  const [chestRooms, setChestRooms] = useState<ChestRoom[]>([]);

  useEffect(() => {
    if (!guildId) return;
    api.guilds[':id'].chests.$get({ param: { id: guildId } })
      .then(res => res.json())
      .then(data => setChestRooms(data || []))
      .catch(console.error);
  }, [guildId]);

  const getChestPosition = (record: RegearRecord) => {
    for (let i = 0; i < chestRooms.length; i++) {
      const room = chestRooms[i];
      const assign = room.assignments.find(a => a.playerId === record.playerId || a.playerName === record.playerName);
      if (assign) {
        return { roomIndex: i, roomName: room.name, x: assign.x, y: assign.y };
      }
    }
    return null;
  };

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];
    
    if (statusFilter.length > 0 && statusFilter.length < ALL_STATUSES.length) {
      result = result.filter(r => statusFilter.includes(r.status));
    } else if (statusFilter.length === 0) {
      result = []; // If nothing selected, show nothing
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'chest') {
        const chestA = getChestPosition(a);
        const chestB = getChestPosition(b);
        if (!chestA && !chestB) return a.playerName.localeCompare(b.playerName);
        if (!chestA) return 1; // no chest goes to bottom
        if (!chestB) return -1;
        
        if (chestA.roomIndex !== chestB.roomIndex) {
          comparison = chestA.roomIndex - chestB.roomIndex;
        } else {
          if (sortConfig.chestMode === 'col') {
            comparison = chestA.x !== chestB.x ? chestA.x - chestB.x : chestA.y - chestB.y;
          } else {
            comparison = chestA.y !== chestB.y ? chestA.y - chestB.y : chestA.x - chestB.x;
          }
        }
      } else if (sortConfig.key === 'playerName') {
        comparison = a.playerName.localeCompare(b.playerName);
      } else if (sortConfig.key === 'ip') {
        comparison = a.ip - b.ip;
      } else if (sortConfig.key === 'deathFame') {
        comparison = a.deathFame - b.deathFame;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, statusFilter, sortConfig, chestRooms]);

  const totalRecordsPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / RECORDS_PER_PAGE));
  
  // Ensure page is within bounds after filtering
  useEffect(() => {
    if (recordsPage > totalRecordsPages) {
      setRecordsPage(1);
    }
  }, [filteredAndSortedRecords.length, recordsPage, totalRecordsPages]);

  const currentRecords = useMemo(() => 
    filteredAndSortedRecords.slice((recordsPage - 1) * RECORDS_PER_PAGE, recordsPage * RECORDS_PER_PAGE), 
  [filteredAndSortedRecords, recordsPage]);

  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    recordId: string;
    action: 'approve' | 'reject' | 'cancel_exclude';
    title: string;
  } | null>(null);
  const [commentText, setCommentText] = useState('');

  // Reset local state when detail changes
  useEffect(() => {
    setConfig(initialConfig);
    setRecords(initialRecords);
    setRecordsPage(1);
  }, [detail]);

  const stats = useMemo(() => {
    let excluded = 0, pendingReview = 0, rejected = 0, pendingRegear = 0, completed = 0;
    records.forEach(r => {
      if (r.status === 'excluded') excluded++;
      else if (r.status === 'pending_review') pendingReview++;
      else if (r.status === 'rejected') rejected++;
      else if (r.status === 'pending_regear') pendingRegear++;
      else if (r.status === 'completed') completed++;
    });
    return { total: records.length, excluded, pendingReview, rejected, pendingRegear, completed };
  }, [records]);

  const pieChartData = useMemo(() => [
    { name: t('guild_dashboard.regear_tab.status.pending_review'), value: stats.pendingReview, color: '#f59e0b' }, // amber-500
    { name: t('guild_dashboard.regear_tab.status.rejected'), value: stats.rejected, color: '#ef4444' }, // red-500
    { name: t('guild_dashboard.regear_tab.status.excluded'), value: stats.excluded, color: '#64748b' }, // slate-500
    { name: t('guild_dashboard.regear_tab.status.pending_regear'), value: stats.pendingRegear, color: '#f43f5e' }, // rose-500
    { name: t('guild_dashboard.regear_tab.status.completed'), value: stats.completed, color: '#10b981' }, // emerald-500
  ].filter(d => d.value > 0), [stats, t]);

  // Aggregate Equipment
  const groupedEquipmentStats = useMemo(() => {
    let baseRecords = [...records];
    baseRecords.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'playerName') comparison = a.playerName.localeCompare(b.playerName);
      else if (sortConfig.key === 'ip') comparison = a.ip - b.ip;
      else if (sortConfig.key === 'deathFame') comparison = a.deathFame - b.deathFame;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    baseRecords = baseRecords.filter(r => equipmentStatusFilter.includes(r.status));

    const groups: { title: string; subtitle?: string; records: RegearRecord[] }[] = [];
    if (equipmentGroupSize === 0 || baseRecords.length === 0) {
      groups.push({ title: t('guild_dashboard.regear_tab.grouping.all_records', { defaultValue: 'All Records' }), records: baseRecords });
    } else {
      for (let i = 0; i < baseRecords.length; i += equipmentGroupSize) {
        const chunk = baseRecords.slice(i, i + equipmentGroupSize);
        let title = '';
        let subtitle = '';
        const uniquePlayers = Array.from(new Set(chunk.map(r => r.playerName)));
        
        if (equipmentGroupSize === 1) {
          title = uniquePlayers.join(', ');
        } else {
          title = t('guild_dashboard.regear_tab.group_title', { defaultValue: 'Group {{index}}', index: Math.floor(i / equipmentGroupSize) + 1 }) + ` (${i + 1} - ${i + chunk.length})`;
          if (uniquePlayers.length > 0) {
            subtitle = uniquePlayers.join(', ');
          }
        }
        groups.push({ title, subtitle, records: chunk });
      }
    }

    return groups.map(group => {
      const agg = new Map<string, Map<string, { itemIdx: number, baseId: string, pLevel: number, count: number, name: string, iconUrl: string, sampleUniqueName: string }>>();

      group.records.forEach(r => {
        r.equipment.forEach(eq => {
          if (!config.allowedSlots.includes(eq.slot)) return;

          if (!agg.has(eq.slot)) {
            agg.set(eq.slot, new Map());
          }
          
          const slotMap = agg.get(eq.slot)!;

          const baseId = getBaseItemId(eq.type);
          const pLevel = calculatePLevel(eq.type);
          const key = `${baseId}_P${pLevel}`;

          if (!slotMap.has(key)) {
            const item = GameData.getItemByUniqueName(eq.type);
            slotMap.set(key, {
              itemIdx: item?.Index || 0,
              baseId,
              pLevel,
              count: 0,
              name: getItemDisplayName(eq.type),
              iconUrl: eq.url,
              sampleUniqueName: eq.type
            });
          }
          slotMap.get(key)!.count += 1;
        });
      });

      const result: Record<string, Record<string, { name: string, iconUrl: string, levels: { pLevel: number, count: number }[], total: number, idx: number }>> = {};
      
      for (const [slot, map] of agg.entries()) {
        result[slot] = {};
        const allItems = Array.from(map.values());
        allItems.sort((a, b) => a.itemIdx - b.itemIdx);
        
        allItems.forEach(item => {
          if (!result[slot][item.baseId]) {
            result[slot][item.baseId] = {
              name: getItemDisplayName(item.sampleUniqueName), // Re-evaluate i18n name
              iconUrl: item.iconUrl,
              levels: [],
              total: 0,
              idx: 0,
            };
          }
          
          result[slot][item.baseId].name = getItemDisplayName(item.sampleUniqueName); // Re-evaluate i18n name on language change
          result[slot][item.baseId].idx = item.itemIdx;
          
          result[slot][item.baseId].levels.push({ pLevel: item.pLevel, count: item.count });
          result[slot][item.baseId].total += item.count;
        });

        // Sort levels within each item
        Object.values(result[slot]).forEach(itemGroup => {
          itemGroup.levels.sort((a, b) => b.pLevel - a.pLevel);
        });
      }

      return { title: group.title, subtitle: group.subtitle, stats: result, recordCount: group.records.length, empty: Object.keys(result).length === 0 };
    });
  }, [records, sortConfig, equipmentStatusFilter, equipmentGroupSize, config.allowedSlots, i18n.language, t]); // Depend on language and filter to trigger re-aggregation

  const updateRecordStatus = async (recordId: string, status: RegearRecord['status'], comment?: string) => {
    try {
      const res = await api.guilds[':guildId'].regear.records[':regearId'].status.$put({
        param: { guildId, regearId: recordId },
        json: { status, comment }
      });
      if (!res.ok) throw new Error('Failed to update status');
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status, reviewComment: comment !== undefined ? comment : r.reviewComment } : r));
    } catch (err) {
      console.error(err);
      // Fallback or show error notification
    }
  };

  const handleAction = (recordId: string, action: string) => {
    if (isPreview) {
      toast.info(t('guild_dashboard.regear_tab.preview_action_warning', { defaultValue: 'This is a preview. Please create the order first to perform actions.' }));
      return;
    }
    
    if (action === 'complete') {
      updateRecordStatus(recordId, 'completed');
    } else if (action === 'rollback_completed') {
      updateRecordStatus(recordId, 'pending_regear');
    } else if (action === 'rollback_rejected') {
      updateRecordStatus(recordId, 'pending_review');
    } else if (action === 'approve') {
      setCommentText('');
      setCommentModal({ isOpen: true, recordId, action: 'approve', title: t('guild_dashboard.regear_tab.comment_modal.title_approve', { defaultValue: 'Approve Record' }) });
    } else if (action === 'reject') {
      setCommentText('');
      setCommentModal({ isOpen: true, recordId, action: 'reject', title: t('guild_dashboard.regear_tab.comment_modal.title_reject', { defaultValue: 'Reject Record' }) });
    } else if (action === 'cancel_exclude') {
      setCommentText('');
      setCommentModal({ isOpen: true, recordId, action: 'cancel_exclude', title: t('guild_dashboard.regear_tab.comment_modal.title_cancel_exclude', { defaultValue: 'Cancel Exclusion' }) });
    }
  };

  const submitComment = async () => {
    if (!commentModal) return;
    const { recordId, action } = commentModal;
    if (action === 'approve') {
      await updateRecordStatus(recordId, 'pending_regear', commentText);
    } else if (action === 'reject') {
      await updateRecordStatus(recordId, 'rejected', commentText);
    } else if (action === 'cancel_exclude') {
      await updateRecordStatus(recordId, 'pending_review', commentText);
    }
    setCommentModal(null);
  };

  const handleSaveConfig = async () => {
    if (isPreview) {
      setConfig(config);
      detail.config = config;
      setShowConfigModal(false);
      return;
    }
    
    try {
      const res = await api.guilds[':guildId'].regear.tickets[':ticketId'].$put({
        param: { guildId, ticketId: order.id },
        json: { config }
      });
      if (!res.ok) throw new Error('Failed to update config');
      detail.config = config;
      setShowConfigModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSort = (key: 'playerName' | 'ip' | 'deathFame' | 'chest') => {
    if (key === 'chest') {
      setSortConfig(prev => {
        if (prev.key !== 'chest') return { key: 'chest', direction: 'asc', chestMode: 'row' };
        if (prev.chestMode === 'row') return { key: 'chest', direction: 'asc', chestMode: 'col' };
        return { key: 'playerName', direction: 'asc' }; // Reset to player name after cycling
      });
      return;
    }
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: 'playerName' | 'ip' | 'deathFame' | 'chest') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    if (key === 'chest') {
      return sortConfig.chestMode === 'row' ? <ArrowRight className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />;
  };

  const handleStartAutoApproval = async (ruleId: string, options: Record<string, any>, updatedConfig: RegearConfig) => {
    setIsAutoApproving(true);
    try {
      if (updatedConfig.defaultPLevel === undefined) {
        throw new Error('Default P-Level is required');
      }

      // If config was changed, save it globally
      if (JSON.stringify(detail.config) !== JSON.stringify(updatedConfig)) {
        // Only update the order's config if it's a real order
        if (!isPreview) {
          await api.guilds[':guildId'].regear.tickets[':ticketId'].$put({
            param: { guildId, ticketId: detail.order.id },
            json: { config: updatedConfig }
          });
        }
        
        setConfig(updatedConfig);
        detail.config = updatedConfig;
      }

      const pendingRecords = records.filter(r => r.status === 'pending_review');
      const updatedRecords = [...records];
      
      for (const record of pendingRecords) {
        // --- 1. Check No Regear Policy ---
        if (updatedConfig.policies?.noRegear?.players.some(p => p.id === record.playerId || p.name === record.playerName)) {
          const comment = t('guild_dashboard.regear_tab.auto_approval.excluded_by_policy', { defaultValue: 'Excluded by No Regear policy' });
          const res = await api.guilds[':guildId'].regear.records[':regearId'].status.$put({
            param: { guildId, regearId: record.id },
            json: { status: 'excluded', comment }
          });
          if (res.ok) {
            const idx = updatedRecords.findIndex(r => r.id === record.id);
            if (idx !== -1) updatedRecords[idx] = { ...updatedRecords[idx], status: 'excluded', reviewComment: comment };
          }
          continue;
        }

        // --- 2. Check Level Groups Policy ---
        let groupMaxPLevel: number | null = null;
        if (updatedConfig.policies?.levelGroups) {
          for (const group of updatedConfig.policies.levelGroups) {
            if (group.players.some(p => p.id === record.playerId || p.name === record.playerName)) {
              groupMaxPLevel = group.maxPLevel;
              break; // Found the user's specific group
            }
          }
        }

        // Use group's max P-Level if user is in a group, otherwise use defaultPLevel
        let targetMaxPLevel = updatedConfig.defaultPLevel;
        if (groupMaxPLevel !== null) {
          targetMaxPLevel = groupMaxPLevel;
        }
        
        const mergedOptions = { ...options, maxPLevel: targetMaxPLevel };

        // --- 3. Evaluate Rule ---
        const result = engine.evaluate(record, updatedConfig, ruleId, mergedOptions, t);
        if (result.approved) {
          const newStatus = 'pending_regear';
          const comment = result.reason;
          
          // Update via API
          const res = await api.guilds[':guildId'].regear.records[':regearId'].status.$put({
            param: { guildId, regearId: record.id },
            json: { status: newStatus, comment }
          });
          
          if (res.ok) {
            // Update local state copy
            const idx = updatedRecords.findIndex(r => r.id === record.id);
            if (idx !== -1) {
              updatedRecords[idx] = { ...updatedRecords[idx], status: newStatus, reviewComment: comment };
            }
          }
        }
      }
      
      setRecords(updatedRecords);
      setShowAutoApproveModal(false);
    } catch (err) {
      console.error('Auto approval failed', err);
      toast.error(t('guild_dashboard.regear_tab.auto_approval.failed', { defaultValue: 'Auto approval failed.' }));
    } finally {
      setIsAutoApproving(false);
    }
  };

  const fetchKillDetail = async (eventId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await (api.guilds.test.albion.events as any)[':eventId'].$get({ param: { eventId } });
      if (!res.ok) throw new Error('Failed to fetch event');
      const ev = await res.json();
      setDetailEventRecord(ev);
    } catch (err) {
      console.error(err);
      toast.error(t('common.load_failed', { defaultValue: 'Failed to load kill details' }));
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-black-bg border border-black-border p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-black-card rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
              {isPreview ? t('guild_dashboard.regear_tab.preview_prefix', { defaultValue: 'Preview: ' }) : t('guild_dashboard.regear_tab.order_prefix')}
              {order.id}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {format(new Date(order.startTime), 'yyyy/MM/dd HH:mm')} - {format(new Date(order.endTime), 'HH:mm')}
              </span>
              <span className={cn(
                "px-2 py-0.5 text-[10px] font-black uppercase rounded-md tracking-wider",
                order.status === 'active' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                {order.status === 'active' ? t('guild_dashboard.regear_tab.status.active') : t('guild_dashboard.regear_tab.status.completed')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPreview && onCreateFromPreview && (
            <button 
              onClick={onCreateFromPreview}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-hover text-black rounded-lg border border-gold font-black uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(250,204,21,0.2)]"
            >
              {t('guild_dashboard.regear_tab.create_from_preview', { defaultValue: 'Create Ticket' })}
            </button>
          )}
          <button 
            onClick={() => setShowConfigModal(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black-card hover:bg-gold/10 hover:border-gold/30 rounded-lg border border-black-border transition-colors cursor-pointer group"
          >
            <Settings2 className="w-4 h-4 text-slate-500 group-hover:text-gold transition-colors" />
            <span className="text-xs font-bold text-slate-400 group-hover:text-gold uppercase tracking-widest transition-colors">{t('guild_dashboard.regear_tab.config_slots', { count: config.allowedSlots.length })}</span>
          </button>
          {!isPreview && onDelete && (
            <button 
              onClick={() => onDelete(order.id)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black-card hover:bg-rose-500/10 hover:border-rose-500/30 rounded-lg border border-black-border transition-colors cursor-pointer group"
            >
              <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-rose-500 transition-colors" />
              <span className="text-xs font-bold text-slate-400 group-hover:text-rose-500 uppercase tracking-widest transition-colors">{t('common.delete', { defaultValue: 'Delete' })}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary & Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Battle Reports Info */}
        <div className="bg-black-bg border border-black-border rounded-xl p-6 flex flex-col justify-center relative overflow-hidden group hover:border-gold/30 transition-colors">
          <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Sword className="w-48 h-48" />
          </div>
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gold" />
            {t('guild_dashboard.regear_tab.related_battles', { defaultValue: 'Related Battles' })}
          </h3>
          <div className="space-y-4 relative z-10">
            <RelatedBattlesStatsWidget battleIds={order.battleIds || []} guildId={guildId} records={records} onOpenModal={() => setShowBattlesModal(true)} />
          </div>
        </div>

        {/* Right: Regear Status Donut Chart */}
        <div className="bg-black-bg border border-black-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            {t('guild_dashboard.regear_tab.status_overview', { defaultValue: 'Order Status Overview' })}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
            <div className="w-[180px] h-[180px] relative flex-shrink-0 min-h-[180px] min-w-[180px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={180}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white leading-none">{stats.total}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>
            
            {/* Chart Legend Table */}
            <div className="flex-1 w-full">
              <table className="w-full text-left text-xs">
                <tbody>
                  {pieChartData.map((item, i) => (
                    <tr key={i} className="border-b border-black-border/50 last:border-0">
                      <td className="py-2 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-slate-300 uppercase tracking-wide">{item.name}</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="font-black text-white">{item.value}</span>
                      </td>
                      <td className="py-2 text-right w-16">
                        <span className="font-bold text-slate-500">
                          {stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-black-bg border border-black-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-black-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2 whitespace-nowrap">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              {t('guild_dashboard.regear_tab.records_title')}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setStatusFilter(statusFilter.length === ALL_STATUSES.length ? [] : [...ALL_STATUSES]);
                }}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                  statusFilter.length === ALL_STATUSES.length
                    ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" 
                    : "bg-black-card text-slate-500 border-black-border hover:border-slate-600 hover:text-slate-300"
                )}
              >
                {t('guild_dashboard.battle_report.all', { defaultValue: 'All' })}
              </button>
              {ALL_STATUSES.map(status => {
                const isActive = statusFilter.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(prev => 
                        isActive ? prev.filter(s => s !== status) : [...prev, status]
                      );
                    }}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                      isActive 
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" 
                        : "bg-black-card text-slate-500 border-black-border hover:border-slate-600 hover:text-slate-300"
                    )}
                  >
                    {t(`guild_dashboard.regear_tab.status.${status}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end xl:self-auto">
            {!isPreview && (
              <button
                onClick={() => setShowAutoApproveModal(true)}
                className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 hover:border-gold/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors mr-2"
              >
                {t('guild_dashboard.regear_tab.auto_approval.button', { defaultValue: 'Auto Approve' })}
              </button>
            )}
            <button 
              onClick={() => setRecordsPage(p => Math.max(1, p - 1))}
              disabled={recordsPage === 1}
              className="p-1.5 bg-black-card border border-black-border hover:border-emerald-500 text-slate-400 hover:text-emerald-500 disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[3rem] text-center">
              {recordsPage} / {totalRecordsPages}
            </span>
            <button 
              onClick={() => setRecordsPage(p => Math.min(totalRecordsPages, p + 1))}
              disabled={recordsPage === totalRecordsPages}
              className="p-1.5 bg-black-card border border-black-border hover:border-emerald-500 text-slate-400 hover:text-emerald-500 disabled:opacity-50 disabled:hover:border-black-border disabled:hover:text-slate-400 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-black-border bg-black-card">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-24">{t('guild_dashboard.regear_tab.columns.status')}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors w-24" onClick={() => handleSort('chest')}>
                  <div className="flex items-center gap-1.5">
                    {t('guild_dashboard.regear_tab.columns.chest', { defaultValue: 'Chest' })}
                    {getSortIcon('chest')}
                  </div>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('playerName')}>
                  <div className="flex items-center gap-1.5">
                    {t('guild_dashboard.regear_tab.columns.player')}
                    {getSortIcon('playerName')}
                  </div>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-6">
                    <span className="cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1.5" onClick={() => handleSort('ip')}>
                      IP
                      {getSortIcon('ip')}
                    </span>
                    <span className="cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1.5" onClick={() => handleSort('deathFame')}>
                      {t('guild_dashboard.battle_report.columns.fame', { defaultValue: 'Fame' })}
                      {getSortIcon('deathFame')}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_tab.columns.equipment')}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_tab.columns.time')}</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">{t('guild_dashboard.regear_tab.columns.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black-border">
              {currentRecords.map((record) => {
                const chestPos = getChestPosition(record);
                const hasMultiRooms = chestRooms.length > 1;

                return (
                <tr key={record.id} className="hover:bg-black-card/50 transition-colors group">
                  <td className="py-4 px-4 w-24">
                    <RecordStatusBadge status={record.status} comment={record.reviewComment} />
                  </td>
                  <td className="py-4 px-4 w-24">
                    {chestPos ? (
                      <div className="flex flex-col">
                        {hasMultiRooms && (
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[80px]" title={chestPos.roomName}>
                            {chestPos.roomName}
                          </span>
                        )}
                        <span className="text-xs font-black text-gold mt-0.5">
                          {t('guild_dashboard.settings.row', { defaultValue: 'Row' })}:{chestPos.y} {t('guild_dashboard.settings.col', { defaultValue: 'Col' })}:{chestPos.x}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {record.mainHandType && record.equipment.find(e => e.slot === 'MainHand')?.url ? (
                        <div className="w-10 h-10 bg-black-bg border border-black-border rounded-lg flex items-center justify-center p-1">
                          <img src={record.equipment.find(e => e.slot === 'MainHand')?.url} alt="Weapon" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-black-bg border border-black-border rounded-lg" />
                      )}
                      <div>
                        <div className="font-bold text-white">{record.playerName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[120px]" title={record.mainHandType ? getItemDisplayName(record.mainHandType) : t('guild_dashboard.regear_tab.unknown')}>
                          {record.mainHandType ? getItemDisplayName(record.mainHandType) : t('guild_dashboard.regear_tab.unknown')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-6">
                      <div className="font-black text-amber-500">{record.ip}</div>
                      <div className="text-xs text-rose-500 font-bold">{formatFame(record.deathFame)}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1">
                      {['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'].map(slot => {
                        const eq = record.equipment.find(e => e.slot === slot);
                        return (
                          <div key={slot} className="w-8 h-8 bg-black-bg border border-black-border rounded flex items-center justify-center" title={eq ? getItemDisplayName(eq.type) : t('guild_dashboard.regear_tab.empty')}>
                            {eq ? <img src={eq.url} alt={slot} className="w-6 h-6 object-contain" /> : null}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-bold text-slate-300">
                      {format(new Date(record.deathTime), 'MM/dd HH:mm')}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => record.eventId && fetchKillDetail(record.eventId)}
                        disabled={!record.eventId || isDetailLoading}
                        className="px-3 py-1.5 bg-black-card hover:bg-black-card/80 text-slate-400 border border-black-border hover:border-slate-500/50 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {t('guild_dashboard.regear_tab.view_details', { defaultValue: 'Details' })}
                      </button>
                      {record.status === 'pending_review' && (
                        <>
                          <button onClick={() => handleAction(record.id, 'approve')} className={cn("px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                            {t('guild_dashboard.regear_tab.actions.approve', { defaultValue: 'Approve' })}
                          </button>
                          <button onClick={() => handleAction(record.id, 'reject')} className={cn("px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 hover:border-rose-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                            {t('guild_dashboard.regear_tab.actions.reject', { defaultValue: 'Reject' })}
                          </button>
                        </>
                      )}
                      {record.status === 'pending_regear' && (
                        <button onClick={() => handleAction(record.id, 'complete')} className={cn("px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                          {t('guild_dashboard.regear_tab.actions.complete', { defaultValue: 'Complete' })}
                        </button>
                      )}
                      {record.status === 'completed' && (
                        <button onClick={() => handleAction(record.id, 'rollback_completed')} className={cn("px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/20 hover:border-slate-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                          {t('guild_dashboard.regear_tab.actions.rollback', { defaultValue: 'Rollback' })}
                        </button>
                      )}
                      {record.status === 'excluded' && (
                        <button onClick={() => handleAction(record.id, 'cancel_exclude')} className={cn("px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/20 hover:border-slate-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                          {t('guild_dashboard.regear_tab.actions.cancel_exclude', { defaultValue: 'Cancel Exclusion' })}
                        </button>
                      )}
                      {record.status === 'rejected' && (
                        <>
                          <button onClick={() => handleAction(record.id, 'rollback_rejected')} className={cn("px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/20 hover:border-slate-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors", isPreview && "opacity-50 cursor-not-allowed")}>
                            {t('guild_dashboard.regear_tab.actions.rollback', { defaultValue: 'Rollback' })}
                          </button>
                          {!isPreview && onDeleteRecord && (
                            <button onClick={() => onDeleteRecord(record.id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 hover:border-rose-500/50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors">
                              {t('common.delete', { defaultValue: 'Delete' })}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Aggregation */}
      <div className="bg-black-bg border border-black-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2 whitespace-nowrap">
            <Package className="w-5 h-5 text-gold" />
            {t('guild_dashboard.regear_tab.equipment_stats_title')}
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            {/* Grouping Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('guild_dashboard.regear_tab.grouping.label', { defaultValue: 'Group By:' })}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={equipmentGroupSize}
                onChange={(e) => setEquipmentGroupSize(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-black-card border border-black-border text-slate-300 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-gold/50"
                placeholder="0"
              />
              <span className="text-[10px] font-bold text-slate-500">{t('guild_dashboard.regear_tab.grouping.unit', { defaultValue: 'records/group (0 for none)' })}</span>
            </div>
            
            <div className="h-4 w-px bg-black-border hidden md:block"></div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEquipmentStatusFilter(equipmentStatusFilter.length === ALL_STATUSES.length ? [] : [...ALL_STATUSES]);
                }}
              className={cn(
                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                equipmentStatusFilter.length === ALL_STATUSES.length
                  ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" 
                  : "bg-black-card text-slate-500 border-black-border hover:border-slate-600 hover:text-slate-300"
              )}
            >
              {t('guild_dashboard.battle_report.all', { defaultValue: 'All' })}
            </button>
            {ALL_STATUSES.map(status => {
              const isActive = equipmentStatusFilter.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => {
                    setEquipmentStatusFilter(prev => 
                      isActive ? prev.filter(s => s !== status) : [...prev, status]
                    );
                  }}
                  className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                    isActive 
                      ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" 
                      : "bg-black-card text-slate-500 border-black-border hover:border-slate-600 hover:text-slate-300"
                  )}
                >
                  {t(`guild_dashboard.regear_tab.status.${status}`)}
                </button>
              );
            })}
          </div>
        </div>
        </div>
        {groupedEquipmentStats.length === 0 || groupedEquipmentStats.every(g => g.empty) ? (
          <div className="text-center p-8 text-slate-500 font-bold uppercase tracking-widest text-sm">{t('guild_dashboard.regear_tab.no_items')}</div>
        ) : (
          <div className="space-y-12">
            {groupedEquipmentStats.map((group, groupIdx) => {
              if (group.empty) return null;
              
              return (
                <div key={groupIdx} className="space-y-6">
                  {/* Group Title */}
                  {equipmentGroupSize > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-md font-black text-gold uppercase tracking-widest">{group.title}</h4>
                        <div className="h-px flex-1 bg-black-border"></div>
                      </div>
                      {group.subtitle && (
                        <div className="text-xs font-bold text-slate-500 tracking-wider pl-1 max-w-full truncate" title={group.subtitle}>
                          {group.subtitle}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-8">
                    {config.allowedSlots.map((slot) => {
                      const itemsMap = group.stats[slot];
                      if (!itemsMap || Object.keys(itemsMap).length === 0) return null;

                      // Sort items by index
                      const sortedItems = Object.entries(itemsMap).sort((a, b) => a[1].idx - b[1].idx);

                      return (
                        <div key={slot} className="space-y-3">
                          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-black-border pb-2">
                            {t(`guild_dashboard.regear_tab.slots.${slot}`, { defaultValue: slot })}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedItems.map(([baseId, data]) => (
                              <div key={baseId} className="flex items-center justify-between p-3 bg-black-card border border-black-border hover:border-gold/30 rounded-xl transition-colors group">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-12 h-12 bg-black-bg border border-black-border rounded-lg flex items-center justify-center p-1 flex-shrink-0 group-hover:border-gold/30 transition-colors">
                                    <img src={data.iconUrl} alt={data.name} className="w-full h-full object-contain" />
                                  </div>
                                  <div className="font-bold text-white text-sm truncate" title={data.name}>
                                    {data.name}
                                  </div>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2 ml-4">
                                  {data.levels.map((level) => (
                                    <div key={level.pLevel} className="flex items-center bg-black-bg border border-black-border rounded-md overflow-hidden text-xs flex-shrink-0">
                                      <span className="px-2 py-1 font-black text-gold border-r border-black-border">
                                        P{level.pLevel}
                                      </span>
                                      <span className="px-2 py-1 font-bold text-white">
                                        x{level.count}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <Modal title={t('guild_dashboard.regear_tab.config_modal_title')} onClose={() => {
          setConfig(detail.config);
          setShowConfigModal(false);
        }}>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              {t('guild_dashboard.regear_tab.config_modal_desc')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape', 'Bag', 'Mount', 'Potion', 'Food'].map(slot => (
                <label key={slot} className="flex items-center gap-3 p-3 bg-black-bg border border-black-border rounded-xl cursor-pointer hover:border-gold/30 transition-colors">
                  <input 
                    type="checkbox"
                    checked={config.allowedSlots.includes(slot)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({ ...config, allowedSlots: [...config.allowedSlots, slot] });
                      } else {
                        setConfig({ ...config, allowedSlots: config.allowedSlots.filter(s => s !== slot) });
                      }
                    }}
                    className="w-4 h-4 rounded border-black-border bg-black-card text-gold focus:ring-gold focus:ring-offset-black-bg"
                  />
                  <span className="text-sm font-bold text-white uppercase tracking-widest">
                    {t(`guild_dashboard.regear_tab.slots.${slot}`, { defaultValue: slot })}
                  </span>
                </label>
              ))}
            </div>
            <div className="pt-4 border-t border-black-border flex justify-end">
              <button 
                onClick={handleSaveConfig}
                className="px-6 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Battles Modal */}
      {showBattlesModal && (
        <Modal title={t('guild_dashboard.regear_tab.related_battles', { defaultValue: 'Related Battles' })} onClose={() => setShowBattlesModal(false)} className="max-w-4xl">
          <RegearRelatedBattles battleIds={order.battleIds || []} />
        </Modal>
      )}
      {/* Comment Modal */}
      {commentModal && (
        <Modal title={commentModal.title} onClose={() => setCommentModal(null)}>
          <div className="space-y-4">
            <textarea
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder={t('guild_dashboard.regear_tab.comment_modal.placeholder', { defaultValue: 'Enter review comment (optional)...' })}
              className="w-full h-32 p-3 bg-black-bg border border-black-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 resize-none"
            />
            <div className="pt-4 border-t border-black-border flex justify-end gap-3">
              <button 
                onClick={() => setCommentModal(null)}
                className="px-6 py-2 bg-black-bg hover:bg-black-card border border-black-border text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button 
                onClick={submitComment}
                className="px-6 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
              >
                {t('guild_dashboard.regear_tab.comment_modal.submit', { defaultValue: 'Submit' })}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Auto Approval Modal */}
      {showAutoApproveModal && (
        <AutoApprovalModal
          onClose={() => setShowAutoApproveModal(false)}
          onStartApproval={handleStartAutoApproval}
          isProcessing={isAutoApproving}
          guildId={guildId}
          currentConfig={config}
          isPreview={!!isPreview}
          ticketId={detail.order.id}
          onConfigChange={(newConfig) => {
            setConfig(newConfig);
            detail.config = newConfig;
          }}
        />
      )}

      {/* Kill Detail Modal */}
      {(detailEventRecord || isDetailLoading) && (
        <KillDetailModal
          record={detailEventRecord || undefined}
          onClose={() => setDetailEventRecord(null)}
          isloading={isDetailLoading}
        />
      )}
    </div>
  );
}



function RecordStatusBadge({ status, comment }: { status: RegearRecord['status'], comment?: string }) {
  const { t } = useTranslation();
  
  const config = {
    excluded: { label: t('guild_dashboard.regear_tab.status.excluded'), color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    pending_review: { label: t('guild_dashboard.regear_tab.status.pending_review'), color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    rejected: { label: t('guild_dashboard.regear_tab.status.rejected'), color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    pending_regear: { label: t('guild_dashboard.regear_tab.status.pending_regear'), color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    completed: { label: t('guild_dashboard.regear_tab.status.completed'), color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  };

  const conf = config[status];

  return (
    <div className="flex flex-col gap-1 items-start relative group/badge">
      <div className={cn("px-2 py-1 text-[10px] font-black uppercase rounded-md tracking-wider border cursor-help", conf.color)} title={comment}>
        {conf.label}
      </div>
      {comment && (
        <div className="absolute left-0 top-full mt-2 w-max max-w-[200px] p-2 bg-black-card border border-black-border rounded-lg shadow-xl z-50 text-xs font-bold text-slate-300 opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all whitespace-normal break-words">
          {comment}
        </div>
      )}
    </div>
  );
}


function RelatedBattlesStatsWidget({ battleIds, guildId, records, onOpenModal }: { battleIds: string[], guildId: string, records: RegearRecord[], onOpenModal: () => void }) {
  const { t } = useTranslation();
  
  const stats = useMemo(() => {
    // Kills require fetching from external events, but deaths can be derived directly from the current records since RegearDetail already loaded them.
    // However, to maintain the semantics of "Total Kills" and "Total Deaths" for these specific battles,
    // we calculate deaths from our local records that match the battleIds.
    let deaths = 0;
    records.forEach(r => {
      // Regear records already represent guild member deaths from these battles
      if (r.eventId && battleIds.includes(r.eventId)) {
        deaths++;
      } else if (r.id) { // using r.id as fallback if eventId is not strictly matching battle
        deaths++;
      }
    });
    return { deaths };
  }, [records, battleIds]);

  const [kills, setKills] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!battleIds?.length) return;
    setLoading(true);
    async function fetchKills() {
      try {
        let totalK = 0;
        const results = await Promise.all(
          battleIds.map(id => api.guilds.test.albion.events.$get({ query: { battleId: id, limit: '51', offset: '0' } }).then(r => r.ok ? r.json() : []))
        );
        results.forEach((events: any) => {
          if (Array.isArray(events)) {
            events.forEach(ev => {
              if (ev.Killer && ev.Killer.GuildId === guildId) {
                totalK++;
              }
            });
          }
        });
        setKills(totalK);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchKills();
  }, [battleIds.join(','), guildId]);

  return (
    <div className="space-y-4 relative z-10">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 p-3 bg-black-card border border-black-border rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('guild_dashboard.regear_tab.total_battles', { defaultValue: 'Total Battles' })}</div>
          </div>
          <div className="text-sm font-black text-white pl-5">{battleIds.length}</div>
        </div>
        <div className="flex flex-col gap-1 p-3 bg-black-card border border-black-border rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('guild_dashboard.regear_tab.duration', { defaultValue: 'Duration' })}</div>
          </div>
          <div className="text-sm font-black text-amber-500 pl-5">{(battleIds.length * 0.5).toFixed(1)} {t('guild_dashboard.regear_tab.hours', { defaultValue: 'Hours' })}</div>
        </div>
        <div className="flex flex-col gap-1 p-3 bg-black-card border border-black-border rounded-lg">
          <div className="flex items-center gap-2">
            <Sword className="w-3.5 h-3.5 text-emerald-500" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('guild_dashboard.regear_tab.guild_kills', { defaultValue: 'Kills' })}</div>
          </div>
          <div className="text-sm font-black text-emerald-500 pl-5 flex items-center h-5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : kills}
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3 bg-black-card border border-black-border rounded-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('guild_dashboard.regear_tab.guild_deaths', { defaultValue: 'Deaths' })}</div>
          </div>
          <div className="text-sm font-black text-rose-500 pl-5 flex items-center h-5">
            {stats.deaths}
          </div>
        </div>
      </div>
      
      <button 
        onClick={onOpenModal}
        disabled={!battleIds.length}
        className="w-full py-2.5 bg-black-card hover:bg-gold/10 hover:border-gold/30 hover:text-gold border border-black-border rounded-lg text-xs font-black uppercase tracking-widest text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black-card disabled:hover:border-black-border disabled:hover:text-slate-400"
      >
        {t('guild_dashboard.regear_tab.view_battles', { defaultValue: 'View Battle Reports' })}
      </button>
    </div>
  );
}
