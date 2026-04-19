import React from 'react';
import { VideoRecord, Role } from '../../../types';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '../../../i18n/LanguageContext';
import { VideoCard } from './VideoCard';

interface VideoGroupProps {
  key?: React.Key;
  date: string;
  roles: Record<string, Record<string, VideoRecord[]>>;
  onPlay: (video: VideoRecord) => void;
  onEdit: (video: VideoRecord) => void;
  onDelete: (id: string) => void;
  boundAccount: string | null;
}

const RoleColor = {
  DPS: 'bg-role-dps/20 text-role-dps',
  Tank: 'bg-role-tank/20 text-role-tank',
  Healer: 'bg-role-healer/20 text-role-healer',
  Support: 'bg-role-support/20 text-role-support',
};

export function VideoGroup({ date, roles, onPlay, onEdit, onDelete, boundAccount }: VideoGroupProps) {
  const { t, lang } = useLanguage();

  return (
    <section className="relative mb-12">
      {/* Sticky Header, floating pill style to avoid full row obstruction */}
      <div className="sticky top-6 z-20 mb-6 pointer-events-none drop-shadow-xl inline-flex w-full">
        <h2 className="text-[1.2rem] text-system-text font-bold bg-system-surface/90 backdrop-blur-md px-4 py-1.5 rounded border border-system-border/50 border-l-[3px] border-l-system-accent shadow-lg pointer-events-auto">
          {format(parseISO(date), lang === 'zh' ? 'yyyy年MM月dd日' : 'MMM d, yyyy')}
        </h2>
      </div>

      <div className="space-y-6">
        {(Object.entries(roles) as [Role, Record<string, VideoRecord[]>][]).map(([role, players]) => (
          <div key={role} className="mb-6">
            <span className={`text-[12px] px-2 py-0.5 rounded-sm inline-block mb-3 font-bold uppercase ${RoleColor[role]}`}>
              {t(`role.${role.toLowerCase()}`)}
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(players).flatMap(([username, playerVideos]) => 
                playerVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    username={username} 
                    onPlay={onPlay} 
                    onEdit={onEdit}
                    onDelete={onDelete}
                    boundAccount={boundAccount}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}