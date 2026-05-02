import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
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
}

export function RegearTab({ guildId }: RegearTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const ticketId = searchParams.get('ticketId');
  const action = searchParams.get('action');
  const isDetailView = !!ticketId || action === 'preview';

  const [orders, setOrders] = useState<RegearOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [realDetail, setRealDetail] = useState<RegearOrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<RegearOrderDetail | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const isCreatingRef = useRef(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewBattleIdsText, setPreviewBattleIdsText] = useState('');
  const [previewError, setPreviewError] = useState('');
  const lastFetchedTicketId = useRef<string | null>(null);
  const lastFetchedPreviewIds = useRef<string | null>(null);

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
  }, [guildId, isDetailView]); // Refresh when view changes (e.g. back from detail)

  useEffect(() => {
    if (!guildId) return;

    if (ticketId) {
      if (lastFetchedTicketId.current !== ticketId) {
        lastFetchedTicketId.current = ticketId;
        lastFetchedPreviewIds.current = null;
        fetchTicketData(ticketId);
      }
    } else if (action === 'preview') {
      const battleIds = (location.state as any)?.battleIds as string[];
      const needApply = (location.state as any)?.needApply as boolean;
      const battleIdsKey = battleIds?.join(',');
      
      if (battleIds && battleIds.length > 0) {
        if (lastFetchedPreviewIds.current !== battleIdsKey) {
          lastFetchedPreviewIds.current = battleIdsKey;
          lastFetchedTicketId.current = null;
          fetchPreviewData(battleIds, needApply);
        }
      } else {
        // No battle IDs provided for preview, revert to list
        setSearchParams(prev => {
          prev.delete('action');
          return prev;
        }, { replace: true });
      }
    } else {
      // Not in detail view
      lastFetchedTicketId.current = null;
      lastFetchedPreviewIds.current = null;
      setPreviewDetail(null);
      setRealDetail(null);
    }
  }, [ticketId, action, guildId, location.state]);

  const handleSelectOrder = async (orderId: string) => {
    setSearchParams(prev => {
      prev.set('tab', 'regear');
      prev.set('ticketId', orderId);
      prev.delete('action');
      return prev;
    });
  };

  const fetchTicketData = async (orderId: string) => {
    if (!guildId) return;
    setPreviewDetail(null);
    setRealDetail(null);
    setIsDetailLoading(true);

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
          battleId: String(dbRecord.battleId ?? ev.BattleId ?? ''),
          status: dbRecord.status,
          reviewComment: dbRecord.comment,
          regearedSlots: typeof dbRecord.regearedSlots === 'string' ? (()=>{try{return JSON.parse(dbRecord.regearedSlots)}catch(e){return []}})() : (dbRecord.regearedSlots || []),
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

      const pendingReview = generatedRecords.filter(r => r.status === 'pending_review' || r.status === 'new_pending_review').length;
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
    setSearchParams(prev => {
      prev.set('tab', 'regear');
      prev.delete('ticketId');
      prev.delete('action');
      return prev;
    });
  };

  const fetchPreviewData = async (ids: string[], needApply?: boolean) => {
    if (!guildId) return;
    setPreviewDetail(null);
    setRealDetail(null);
    setIsDetailLoading(true);
    
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

      const [battleEventsArray, regearsRes, appliesRes] = await Promise.all([
        Promise.all(ids.map(fetchEventsForBattle)),
        api.guilds[':guildId'].regear.records['by-battles'].$post({ param: { guildId }, json: { battleIds: ids } }),
        api.regear_applies['by-battles'].$post({ json: { battleIds: ids } })
      ]);

      const existingRegears = regearsRes.ok ? await regearsRes.json() as any[] : [];
      const existingApplies = appliesRes.ok ? await appliesRes.json() as any[] : [];

      battleEventsArray.forEach(events => allEvents.push(...events));

      const rawBattleEventsMap: Record<string, AlbionOfficialEvent[]> = {};
      ids.forEach((battleId, idx) => {
        rawBattleEventsMap[battleId] = battleEventsArray[idx] ?? [];
      });

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

        const eventIdStr = String(ev.EventId);
        
        const existingRegear = existingRegears.find(r => r.eventId === eventIdStr && r.status !== 'excluded');
        const existingApply = existingApplies.find(a => a.eventId === eventIdStr);
        let status: any = 'new_pending_review';
        if (existingRegear) {
          status = existingRegear.status;
        } else if (needApply) {
          status = existingApply ? 'new_pending_review' : 'excluded';
        } else {
          status = 'new_pending_review';
        }

        recordsMap.set(eventIdStr, {
          id: eventIdStr,
          eventId: eventIdStr,
          battleId: String(ev.BattleId ?? ''),
          status,
          reviewComment: existingRegear?.comment || existingApply?.message,
          regearedSlots: typeof existingRegear?.regearedSlots === 'string' ? (()=>{try{return JSON.parse(existingRegear.regearedSlots)}catch(e){return []}})() : (existingRegear?.regearedSlots || []),
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
      const regearEventIdSet = new Set(regearRecords.map(r => r.eventId).filter(Boolean) as string[]);

      const filteredBattleEventsMap: Record<string, string[]> = {};
      Object.entries(rawBattleEventsMap).forEach(([battleId, events]) => {
        const filtered = events.filter(ev => regearEventIdSet.has(String(ev.EventId)));
        if (filtered.length > 0) {
          filteredBattleEventsMap[battleId] = Array.from(new Set(filtered.map(ev => String(ev.EventId))));
        }
      });

      if (regearRecords.length === 0) {
        throw new Error(t('guild_dashboard.regear_tab.create_no_deaths', { defaultValue: 'No deaths found for your guild in these battles.' }));
      }

      const settingsRes = await api.guilds[':id'].settings.$get({ param: { id: guildId } });
      let defaultAllowedSlots = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'];
      let defaultPLevel = undefined;
      let defaultPolicies = undefined;
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json() as any;
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

      const pendingReview = regearRecords.filter(r => r.status === 'pending_review' || r.status === 'new_pending_review').length;
      const pendingRegear = regearRecords.filter(r => r.status === 'pending_regear').length;
      const completedRegear = regearRecords.filter(r => r.status === 'completed').length;

      const newPreview: RegearOrderDetail = {
        order: {
          id: 'PREVIEW-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          startTime: generatedRecords.length > 0 ? generatedRecords[0].deathTime : new Date().toISOString(),
          endTime: generatedRecords.length > 0 ? generatedRecords[generatedRecords.length - 1].deathTime : new Date().toISOString(),
          status: 'active',
          battleIds: Object.keys(filteredBattleEventsMap),
          stats: {
            totalDeaths: regearRecords.length,
            reviewedDeaths: regearRecords.length - pendingReview,
            pendingReview,
            pendingRegear,
            completedRegear,
            // excludedRegear: 0,
            // rejectedRegear: 0,
          }
        },
        config: {
          allowedSlots: defaultAllowedSlots,
          defaultPLevel,
          policies: defaultPolicies
        },
        records: regearRecords,
        battleEvents: filteredBattleEventsMap
      };

      setPreviewDetail(newPreview);
      setRealDetail(null);
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate preview');
      handleBack(); // Revert back to list on error
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleManualCreatePreview = async () => {
    const ids = previewBattleIdsText.split(/[\s,]+/).filter(id => id.trim());
    if (ids.length === 0) {
      setPreviewError(t('guild_dashboard.regear_tab.create_no_ids', { defaultValue: 'Please enter at least one Battle ID' }));
      return;
    }
    
    setShowCreateModal(false);
    setPreviewBattleIdsText('');
    navigate('?tab=regear&action=preview', { state: { battleIds: ids } });
  };

  const handleCreateOrderFromPreview = async (preview: RegearOrderDetail) => {
    if (!guildId) return;
    if (isCreatingRef.current) return;
    
    isCreatingRef.current = true;
    setIsCreatingOrder(true);
    try {
      const needApply = (location.state as any)?.needApply as boolean | undefined;
      const battleEvents = preview.battleEvents;
      if (!battleEvents || Object.keys(battleEvents).length === 0) {
        throw new Error('Missing battle events in preview. Please regenerate the preview.');
      }
      const players: Record<string, string> = {};
      
      preview.records.forEach(r => {
        if (r.eventId) {
          players[r.eventId] = r.playerName;
        }
      });

      const res = await api.guilds[':guildId'].regear.tickets.$post({
        param: { guildId },
        json: {
          battleEvents,
          players,
          server: 'asia', // TODO: Get from guild server context
          config: preview.config,
          needApply,
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
    } finally {
      isCreatingRef.current = false;
      setIsCreatingOrder(false);
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
      <div className={cn(!isDetailView ? 'block' : 'hidden')}>
        {isLoadingOrders ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : (
          <RegearList orders={orders} onSelectOrder={handleSelectOrder} onCreatePreview={() => setShowCreateModal(true)} onDeleteOrder={handleDeleteOrder} />
        )}
      </div>

      <div className={cn(isDetailView ? 'block' : 'hidden')}>
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
            isCreating={isCreatingOrder}
            onCreateFromPreview={() => previewDetail && handleCreateOrderFromPreview(previewDetail)}
          />
        ) : (
          <div className="text-center p-8 text-rose-500">{t('guild_dashboard.regear_tab.order_not_found')}</div>
        )}
      </div>

      {/* Create Preview Modal */}
      {showCreateModal && (
        <Modal title={t('guild_dashboard.regear_tab.create_preview_title', { defaultValue: 'Preview Regear Order' })} onClose={() => setShowCreateModal(false)}>
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
            />
            {previewError && <p className="text-xs font-bold text-rose-500">{previewError}</p>}
            <div className="pt-4 border-t border-black-border flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-black-bg hover:bg-black-card border border-black-border text-slate-400 text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button 
                onClick={handleManualCreatePreview}
                disabled={!previewBattleIdsText.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-black uppercase tracking-widest rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.preview', { defaultValue: 'Preview' })}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
