import React, { useMemo, useState, useEffect } from 'react';
import { useVideos } from '../../hooks/useVideos';
import { useLanguage } from '../../i18n/LanguageContext';
import { VideoRecord } from '../../types';
import { VideoGroup } from './components/VideoGroup';
import { AppShell } from '../../components/layout/AppShell';
import { UploadModal } from '../../components/modals/UploadModal';
import { PlayerModal } from '../../components/modals/PlayerModal';
import { BindAccountModal } from '../../components/modals/BindAccountModal';
import { UploadProgressToast } from '../../components/ui/UploadProgressToast';

import { EditVideoModal } from '../../components/modals/EditVideoModal';

export function DashboardPage() {
  const { videos, refreshVideos, handleDelete, handleUpdate } = useVideos();
  const { t } = useLanguage();
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null);
  const [boundAccount, setBoundAccount] = useState<string | null>(null);

  useEffect(() => {
    const account = localStorage.getItem('albion_bound_account');
    if (account) {
      setBoundAccount(account);
    }
  }, []);

  // Group by Date -> Role -> Username
  const groupedList = useMemo(() => {
    const dates: Record<string, Record<string, Record<string, VideoRecord[]>>> = {};
    
    videos.forEach(v => {
      if (!dates[v.date]) dates[v.date] = {};
      if (!dates[v.date][v.role]) dates[v.date][v.role] = {};
      if (!dates[v.date][v.role][v.username]) dates[v.date][v.role][v.username] = [];
      
      dates[v.date][v.role][v.username].push(v);
    });
    
    // Sort dates desc
    const sortedDates = Object.keys(dates).sort((a, b) => b.localeCompare(a));
    return sortedDates.map(date => ({
      date,
      roles: dates[date]
    }));
  }, [videos]);

  if (!boundAccount) {
    return (
      <>
        <AppShell onOpenUpload={() => setIsUploadOpen(true)} boundAccount={boundAccount}>
          <div className="flex flex-col items-center justify-center flex-1 text-system-dim mt-20">
            <BindAccountModal onBound={(username) => setBoundAccount(username)} />
          </div>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <AppShell onOpenUpload={() => setIsUploadOpen(true)} boundAccount={boundAccount}>
        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-system-dim mt-20">
            <p className="text-xl mb-2 text-system-text font-bold">{t('dash.noRecords')}</p>
            <p className="text-sm">{t('dash.uploadBegin')}</p>
          </div>
        ) : (
          <div className="pb-24">
            {groupedList.map(({ date, roles }) => (
              <VideoGroup 
                key={date} 
                date={date} 
                roles={roles} 
                onPlay={setActiveVideo} 
                onEdit={setEditingVideo}
                onDelete={handleDelete} 
                boundAccount={boundAccount}
              />
            ))}
          </div>
        )}
      </AppShell>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)}
          onUploaded={refreshVideos}
        />
      )}

      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onUpdated={handleUpdate}
        />
      )}

      {activeVideo && (
        <PlayerModal
          video={activeVideo}
          videos={videos}
          onClose={() => setActiveVideo(null)}
          onUpdate={handleUpdate}
        />
      )}

      <UploadProgressToast />
    </>
  );
}