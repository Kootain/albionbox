import { useState, useEffect } from 'react';
import { RegearList } from './regear-components/RegearList';
import { RegearDetail } from './regear-components/RegearDetail';
import { RegearOrderDetail, RegearRecord, RegearOrder } from './regear-components/types';
import { cn, getAlbionItemUrl } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { AlbionOfficialEvent } from '@albionbox/shared';

interface RegearTabProps {
  guildId?: string;
  initialPreviewBattleIds?: string[] | null;
  onPreviewClear?: () => void;
  initialTicketId?: string | null;
  onTicketIdClear?: () => void;
}

export function RegearTab({ guildId, initialPreviewBattleIds, onPreviewClear, initialTicketId, onTicketIdClear }: RegearTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [orders, setOrders] = useState<RegearOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [realDetail, setRealDetail] = useState<RegearOrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    let mounted = true;
    const fetchOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const res = await api.guilds[':guildId'].regear.tickets.$get({ param: { guildId } });
        if (!res.ok) throw new Error('Failed to fetch tickets');
        const data = await res.json();
        if (!mounted) return;
        const mappedOrders: RegearOrder[] = data.map((t: any) => ({
          id: t.id,
          startTime: t.createdAt,
          endTime: t.updatedAt,
          status: t.stats.pendingReview + t.stats.pendingRegear === 0 ? 'completed' : 'active',
          battleIds: t.battleIds || [],
          stats: t.stats || {
            totalDeaths: 0,
            reviewedDeaths: 0,
            pendingReview: 0,
            pendingRegear: 0,
            completedRegear: 0,
          }
        }));
        // Sort by created time desc
        mappedOrders.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        setOrders(mappedOrders);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoadingOrders(false);
      }
    };
    fetchOrders();
    return () => { mounted = false; };
  }, [guildId, currentView]); // Refresh when view changes (e.g. back from detail)
  const [previewDetail, setPreviewDetail] = useState<RegearOrderDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewBattleIdsText, setPreviewBattleIdsText] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (initialPreviewBattleIds && initialPreviewBattleIds.length > 0) {
      setPreviewBattleIdsText(initialPreviewBattleIds.join(', '));
      setShowCreateModal(true);
      
      setTimeout(() => {
        handleCreatePreview(initialPreviewBattleIds);
        if (onPreviewClear) {
          onPreviewClear();
        }
      }, 100);
    }
  }, [initialPreviewBattleIds]);

  useEffect(() => {
    if (initialTicketId && guildId) {
      if (currentView !== 'detail' || (realDetail && realDetail.order.id !== initialTicketId)) {
        setTimeout(() => {
          handleSelectOrder(initialTicketId);
        }, 0);
      }
    }
  }, [initialTicketId, guildId, currentView, realDetail]);

  const handleSelectOrder = async (orderId: string) => {
    if (!guildId) return;
    setPreviewDetail(null);
    setRealDetail(null);
    setIsDetailLoading(true);
    setCurrentView('detail');

    if (onTicketIdClear) {
      onTicketIdClear();
    }

    try {
      const res = await api.guilds[':guildId'].regear.tickets[':ticketId'].$get({ param: { guildId, ticketId: orderId } });
      if (!res.ok) throw new Error('Failed to fetch ticket detail');
      const ticket = await res.json();

      // Fetch events for each battle ID concurrently
      const allEvents: AlbionOfficialEvent[] = [];
      const fetchEventsForBattle = async (id: string) => {
        const events: AlbionOfficialEvent[] = [];
        let offset = 0;
        const limit = 51;
        while (true) {
          const evRes = await api.guilds.test.albion.events.$get({ query: { battleId: id, limit: String(limit), offset: String(offset) } });
          if (!evRes.ok) break;
          const chunk = await evRes.json() as AlbionOfficialEvent[];
          events.push(...chunk);
          if (chunk.length < limit) break;
          offset += limit;
        }
        return events;
      };

      const battleEventsArray = await Promise.all(ticket.battleIds.map(fetchEventsForBattle));
      battleEventsArray.forEach(events => allEvents.push(...events));

      // Map albion events against the ticket's regears array
      const dbRegearsMap = new Map<string, any>(ticket.regears.map((r: any) => [r.eventId, r]));
      
      const recordsMap = new Map<string, RegearRecord>();
      allEvents.forEach(ev => {
        const evIdStr = String(ev.EventId);
        const dbRecord = dbRegearsMap.get(evIdStr);
        if (!dbRecord) return; // Only show records that are tracked in this ticket

        if (recordsMap.has(evIdStr)) return;

        const victim = ev.Victim;
        const equipment: { slot: string; url: string; type: string }[] = [];
        const slots = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape', 'Bag', 'Mount', 'Potion', 'Food'];
        
        slots.forEach(slot => {
          const item = victim.Equipment[slot as keyof typeof victim.Equipment];
          if (item) {
            equipment.push({ slot, url: getAlbionItemUrl(item.Type, item.Quality, 1), type: item.Type });
          }
        });

        recordsMap.set(evIdStr, {
          id: dbRecord.id, // Internal DB regearId
          guildId: ev.Victim?.GuildId,
          eventId: evIdStr,
          status: dbRecord.status,
          reviewComment: dbRecord.comment,
          deathTime: ev.TimeStamp,
          deathFame: victim.DeathFame,
          playerName: victim.Name,
          ip: Math.round(victim.AverageItemPower),
          mainHandType: victim.Equipment.MainHand?.Type,
          equipment
        });
      });

      const generatedRecords = Array.from(recordsMap.values());
      generatedRecords.sort((a, b) => new Date(a.deathTime).getTime() - new Date(b.deathTime).getTime());

      const pendingReview = generatedRecords.filter(r => r.status === 'pending_review').length;
      const pendingRegear = generatedRecords.filter(r => r.status === 'pending_regear').length;
      const completedRegear = generatedRecords.filter(r => r.status === 'completed').length;
      // const excludedRegear = generatedRecords.filter(r => r.status === 'excluded').length;
      // const rejectedRegear = generatedRecords.filter(r => r.status === 'rejected').length;

      setRealDetail({
        order: {
          id: ticket.id,
          startTime: ticket.createdAt,
          endTime: ticket.updatedAt,
          status: (pendingReview + pendingRegear === 0) ? 'completed' : 'active',
          battleIds: ticket.battleIds,
          stats: {
            totalDeaths: generatedRecords.length,
            reviewedDeaths: generatedRecords.length - pendingReview,
            pendingReview,
            pendingRegear,
            completedRegear,
            // excludedRegear,
            // rejectedRegear
          }
        },
        config: ticket.config || { allowedSlots: ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'] },
        records: generatedRecords
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentView('list');
  };

  const handleCreatePreview = async (overrideIds?: string[]) => {
    const ids = overrideIds || previewBattleIdsText.split(/[\s,]+/).filter(id => id.trim());
    if (!guildId) return;
    if (ids.length === 0) {
      toast.info(t('guild_dashboard.regear_tab.create_no_ids', { defaultValue: 'Please enter at least one Battle ID' }));
      return;
    }
    
    setIsPreviewLoading(true);
    setPreviewError('');
    
    try {
      // Fetch events for each battle ID concurrently
      const allEvents: AlbionOfficialEvent[] = [];
      
      const fetchEventsForBattle = async (id: string) => {
        const events: AlbionOfficialEvent[] = [];
        let offset = 0;
        const limit = 51;
        while (true) {
          const res = await api.guilds.test.albion.events.$get({ query: { battleId: id, limit: String(limit), offset: String(offset) } });
          if (!res.ok) throw new Error(`Failed to fetch events for battle ${id}`);
          const chunk = await res.json() as AlbionOfficialEvent[];
          events.push(...chunk);
          if (chunk.length < limit) break;
          offset += limit;
        }
        return events;
      };

      const battleEventsArray = await Promise.all(ids.map(fetchEventsForBattle));
      battleEventsArray.forEach(events => allEvents.push(...events));

      // Map events to RegearRecords
      const recordsMap = new Map<string, RegearRecord>();
      
      allEvents.forEach(ev => {
        if (!ev.Victim) return;

        const victim = ev.Victim;
        
        // Avoid duplicate death records from same event
        if (recordsMap.has(String(ev.EventId))) return;

        const equipment: { slot: string; url: string; type: string }[] = [];
        const slots = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape', 'Bag', 'Mount', 'Potion', 'Food'];
        
        slots.forEach(slot => {
          const item = victim.Equipment[slot as keyof typeof victim.Equipment];
          if (item) {
            equipment.push({ slot, url: getAlbionItemUrl(item.Type, item.Quality, 1), type: item.Type });
          }
        });

        recordsMap.set(String(ev.EventId), {
          id: String(ev.EventId),
          eventId: String(ev.EventId),
          status: 'pending_review',
          deathTime: ev.TimeStamp,
          deathFame: victim.DeathFame,
          playerName: victim.Name,
          ip: Math.round(victim.AverageItemPower),
          mainHandType: victim.Equipment.MainHand?.Type,
          equipment,
          guildId: victim.GuildId,
        });
      });

      const generatedRecords = Array.from(recordsMap.values());
      generatedRecords.sort((a, b) => new Date(a.deathTime).getTime() - new Date(b.deathTime).getTime());
      const regearRecords = generatedRecords.filter(r => r.guildId === guildId);

      if (regearRecords.length === 0) {
        throw new Error(t('guild_dashboard.regear_tab.create_no_deaths', { defaultValue: 'No deaths found for your guild in these battles.' }));
      }

      const settingsRes = await api.guilds[':id'].settings.$get({ param: { id: guildId } });
      let defaultAllowedSlots = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'];
      let defaultPLevel = undefined;
      let defaultPolicies = undefined;
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        if (settings.regearConfig?.allowedSlots) {
          defaultAllowedSlots = settings.regearConfig.allowedSlots;
        }
        if (settings.regearConfig?.defaultPLevel) {
          defaultPLevel = settings.regearConfig.defaultPLevel;
        }
        if (settings.regearConfig?.policies) {
          defaultPolicies = settings.regearConfig.policies;
        }
      }

      const newPreview: RegearOrderDetail = {
        order: {
          id: 'PREVIEW-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          startTime: generatedRecords.length > 0 ? generatedRecords[0].deathTime : new Date().toISOString(),
          endTime: generatedRecords.length > 0 ? generatedRecords[generatedRecords.length - 1].deathTime : new Date().toISOString(),
          status: 'active',
          battleIds: ids,
          stats: {
            totalDeaths: generatedRecords.length,
            reviewedDeaths: 0,
            pendingReview: generatedRecords.length,
            pendingRegear: 0,
            completedRegear: 0,
            // excludedRegear: 0,
            // rejectedRegear: 0,
          }
        },
        config: {
          allowedSlots: defaultAllowedSlots,
          defaultPLevel,
          policies: defaultPolicies
        },
        records: regearRecords
      };

      setPreviewDetail(newPreview);
      setRealDetail(null);
      setShowCreateModal(false);
      setPreviewBattleIdsText('');
      setCurrentView('detail');
      
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to generate preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCreateOrderFromPreview = async (preview: RegearOrderDetail) => {
    if (!guildId) return;
    
    try {
      const eventIds: string[] = [];
      const players: Record<string, string> = {};
      
      preview.records.forEach(r => {
        if (r.eventId) {
          eventIds.push(r.eventId);
          players[r.eventId] = r.playerName;
        }
      });

      const res = await api.guilds[':guildId'].regear.tickets.$post({
        param: { guildId },
        json: {
          battleIds: preview.order.battleIds,
          eventIds,
          players,
          server: 'asia', // TODO: Get from guild server context
          config: preview.config
        }
      });

      if (!res.ok) {
        const err = await res.json() as any;
        throw new Error(err.error || 'Failed to create order');
      }

      const data = await res.json() as any;
      
      // Fetch fresh tickets to update list
      const fetchRes = await api.guilds[':guildId'].regear.tickets.$get({ param: { guildId } });
      if (fetchRes.ok) {
        const tickets = await fetchRes.json();
        const mappedOrders: RegearOrder[] = tickets.map((t: any) => ({
          id: t.id,
          startTime: t.createdAt,
          endTime: t.updatedAt,
          status: t.stats.pendingReview + t.stats.pendingRegear === 0 ? 'completed' : 'active',
          battleIds: t.battleIds || [],
          stats: t.stats || {
            totalDeaths: 0,
            reviewedDeaths: 0,
            pendingReview: 0,
            pendingRegear: 0,
            completedRegear: 0,
          }
        }));
        mappedOrders.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        setOrders(mappedOrders);
      }
      
      // Switch from preview to real detail
      handleSelectOrder(data.ticketId);
      
    } catch (err: any) {
      console.error('Failed to create order from preview', err);
      toast.error(err.message || 'Failed to create order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!guildId) return;
    if (!(await confirm.confirm({ message: t('guild_dashboard.regear_tab.confirm_delete_order', { defaultValue: 'Are you sure you want to delete this order?' }), danger: true }))) return;
    
    try {
      const res = await api.guilds[':guildId'].regear.tickets[':ticketId'].$delete({ param: { guildId, ticketId: orderId } });
      if (!res.ok) throw new Error('Failed to delete order');
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete order');
    }
  };

  const detailData = previewDetail ? previewDetail : realDetail;

  return (
    <div className="p-6 bg-black-card rounded-2xl border border-black-border mt-6">
      <div className={cn(currentView === 'list' ? 'block' : 'hidden')}>
        {isLoadingOrders ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : (
          <RegearList orders={orders} onSelectOrder={handleSelectOrder} onCreatePreview={() => setShowCreateModal(true)} onDeleteOrder={handleDeleteOrder} />
        )}
      </div>

      <div className={cn(currentView === 'detail' ? 'block' : 'hidden')}>
        {isDetailLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : detailData ? (
          <RegearDetail 
            detail={detailData} 
            onBack={handleBack} 
            guildId={guildId!} 
            isPreview={!!previewDetail}
            onCreateFromPreview={() => previewDetail && handleCreateOrderFromPreview(previewDetail)}
          />
        ) : (
          <div className="text-center p-8 text-rose-500">{t('guild_dashboard.regear_tab.order_not_found')}</div>
        )}
      </div>

      {/* Create Preview Modal */}
      {showCreateModal && (
        <Modal title={t('guild_dashboard.regear_tab.create_preview_title', { defaultValue: 'Preview Regear Order' })} onClose={() => !isPreviewLoading && setShowCreateModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              {t('guild_dashboard.regear_tab.create_preview_desc', { defaultValue: 'Enter Battle IDs to fetch events and generate a preview regear order.' })}
            </p>
            <textarea
              autoFocus
              value={previewBattleIdsText}
              onChange={(e) => setPreviewBattleIdsText(e.target.value)}
              placeholder="e.g. BR-1001, BR-1002"
              className="w-full h-32 p-3 bg-black-bg border border-black-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 resize-none"
              disabled={isPreviewLoading}
            />
            {previewError && <p className="text-xs font-bold text-rose-500">{previewError}</p>}
            <div className="pt-4 border-t border-black-border flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                disabled={isPreviewLoading}
                className="px-6 py-2 bg-black-bg hover:bg-black-card border border-black-border text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button 
                onClick={() => handleCreatePreview()}
                disabled={isPreviewLoading || !previewBattleIdsText.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('common.preview', { defaultValue: 'Preview' })}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
