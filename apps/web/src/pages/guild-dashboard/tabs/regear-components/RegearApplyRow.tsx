import { Crosshair, Image as ImageIcon, Link as LinkIcon, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { ApplyStatus } from '@albionbox/shared';
import { RegearApply } from '../RegearApprovalTab';

interface RegearApplyRowProps {
  row: RegearApply;
  usersMap: Record<string, string>;
  channelsMap: Record<string, string>;
  deleteSaving: boolean;
  formatTime: (iso: string) => string;
  normalizeApplyTimestamp: (ts: string) => string;
  getStatusBadge: (s: ApplyStatus) => React.ReactNode;
  onShowDeathDetails: (row: RegearApply) => void;
  onSetSelectedImage: (url: string) => void;
  onDeleteApply: (id: string) => Promise<void>;
}

export function RegearApplyRow({
  row,
  usersMap,
  channelsMap,
  deleteSaving,
  formatTime,
  normalizeApplyTimestamp,
  getStatusBadge,
  onShowDeathDetails,
  onSetSelectedImage,
  onDeleteApply
}: RegearApplyRowProps) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const toast = useToast();

  let mapName = '-';
  let deathTime = '';
  try {
    if (row.applyDetail) {
      const detail = JSON.parse(row.applyDetail);
      mapName = detail.mapName || '-';
      const ts = detail.timestamp;
      deathTime = normalizeApplyTimestamp(ts);
    }
  } catch (e) {}
  const deathTimeText = deathTime ? formatTime(deathTime) : '';

  return (
    <tr className="hover:bg-black-card/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-300">{formatTime(row.createTime)}</span>
          {deathTimeText && deathTimeText !== '-' && (
            <span className="text-[10px] text-slate-600 font-bold">
              {t('guild_dashboard.regear_approval.table.death_time', { defaultValue: 'Death' })}: {deathTimeText}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">{getStatusBadge(row.status)}</td>
      <td className="py-3 px-4 text-sm text-slate-200 font-bold">{row.victimName || '-'}</td>
      <td className="py-3 px-4 text-xs text-slate-400">{mapName}</td>
      <td className="py-3 px-4 text-xs text-slate-400">{row.victimGuild || '-'}</td>
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="text-xs text-slate-200 font-bold">{row.msgUsername || usersMap[row.msgUserid || ''] || '-'}</span>
          <span className="text-[10px] text-slate-600 font-mono">{row.msgUserid || '-'}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
        {channelsMap[row.msgChannel || ''] || row.msgChannel || '-'}
      </td>
      <td className="py-3 px-4">
        {row.regearTicketId ? (
          <button
            onClick={() => {
              setSearchParams(prev => {
                prev.set('tab', 'regear');
                prev.set('ticketId', String(row.regearTicketId));
                prev.delete('action');
                return prev;
              });
            }}
            className="flex items-center justify-center p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors"
            title={t('guild_dashboard.regear_approval.supplement.view_ticket', { defaultValue: '查看工单' })}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-slate-600">-</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => onShowDeathDetails(row)}
            className="p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors inline-flex items-center justify-center"
            title={t('guild_dashboard.regear_approval.supplement.detail', { defaultValue: '详情' })}
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (row.applyMeta) {
                try {
                  const meta = JSON.parse(row.applyMeta);
                  if (meta.imageUrl) {
                    try {
                      const urlObj = new URL(meta.imageUrl);
                      const proxyUrl = `https://img.albionbox.com/kook${urlObj.pathname}${urlObj.search}`;
                      onSetSelectedImage(proxyUrl);
                    } catch {
                      onSetSelectedImage(meta.imageUrl);
                    }
                  } else {
                    toast.error('No image URL found in apply record');
                  }
                } catch (e) {
                  toast.error('Failed to parse apply meta');
                }
              } else {
                toast.error('No apply record meta available');
              }
            }}
            className="p-1.5 bg-black-bg border border-black-border hover:border-gold/30 text-slate-400 hover:text-gold rounded transition-colors inline-flex items-center justify-center"
            title={t('guild_dashboard.regear_approval.supplement.image', { defaultValue: '查看申请图片' })}
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                message: t('guild_dashboard.regear_approval.supplement.confirm_delete_apply', { defaultValue: '确定要删除这条申请吗？' }),
                danger: true,
              });
              if (!ok) return;
              await onDeleteApply(row.id);
            }}
            className="p-1.5 bg-black-bg border border-black-border hover:border-rose-500/30 text-slate-400 hover:text-rose-500 rounded transition-colors inline-flex items-center justify-center disabled:opacity-50"
            title={t('common.delete', { defaultValue: '删除' })}
            disabled={deleteSaving}
          >
            {deleteSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
