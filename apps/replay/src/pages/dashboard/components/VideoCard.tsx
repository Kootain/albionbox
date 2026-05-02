import React from 'react';
import { VideoRecord } from '../../../types';
import { useLanguage } from '../../../i18n/LanguageContext';

import { Edit2, Trash2 } from 'lucide-react';

interface VideoCardProps {
  key?: React.Key;
  video: VideoRecord;
  username: string;
  onPlay: (video: VideoRecord) => void;
  onEdit: (video: VideoRecord) => void;
  onDelete: (id: string) => void;
  boundAccount: string | null;
}

export function VideoCard({ video, username, onPlay, onEdit, onDelete, boundAccount }: VideoCardProps) {
  const { t } = useLanguage();
  
  const canDelete = boundAccount && boundAccount.toLowerCase() === username.toLowerCase();
  
  return (
    <div 
      className="bg-system-surface rounded-lg overflow-hidden border border-system-border hover:border-system-accent transition-colors cursor-pointer flex flex-col group relative"
      onClick={() => onPlay(video)}
    >
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-[#222] relative flex items-center justify-center overflow-hidden">
         <span className="absolute inset-0 flex items-center justify-center text-[4rem] font-black text-white/5 select-none uppercase tracking-widest pointer-events-none">
           {username.slice(0, 2)}
         </span>
         <span className="text-2xl opacity-50 group-hover:opacity-100 group-hover:text-system-accent transition-all text-white drop-shadow-md z-10">▶</span>
      </div>
      
      <div className="p-3">
        <div className="font-bold text-[14px] text-system-text truncate group-hover:text-system-accent transition-colors flex justify-between items-center">
          <span className="truncate" title={video.title || ''}>
            {video.title && video.title.trim() !== 'title' ? video.title : ''}
          </span>
          {canDelete && (
            <div className="flex gap-1 shrink-0 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(video);
                }}
                className="flex items-center gap-1 text-system-dim hover:text-system-accent text-[10px] px-2 py-1 opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-wider rounded bg-system-bg/50"
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
                <span className="hidden sm:inline">{t('dash.edit') || 'EDIT'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t('dash.deleteConfirm'))) {
                    onDelete(video.id);
                  }
                }}
                className="flex items-center gap-1 text-system-dim hover:text-red-500 text-[10px] px-2 py-1 opacity-50 group-hover:opacity-100 transition-opacity uppercase tracking-wider rounded bg-system-bg/50"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">{t('dash.delete')}</span>
              </button>
            </div>
          )}
        </div>
        <div className="text-[11px] text-system-dim mt-1 flex justify-between items-center gap-2">
          <div className="truncate shrink">
            <span className="uppercase">{video.filename}</span> • {video.highlights.length} {t('dash.marks')}
          </div>
          <span className="font-medium shrink-0 ml-auto">{username}</span>
        </div>
      </div>
    </div>
  );
}