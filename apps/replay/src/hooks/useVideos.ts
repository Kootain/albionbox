import { useState, useEffect, useCallback } from 'react';
import { fetchVideos, deleteVideo } from '../lib/api';
import { VideoRecord } from '../types';

export function useVideos() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);

  const refreshVideos = useCallback(async () => {
    try {
      const v = await fetchVideos();
      setVideos(v);
    } catch (err) {
      console.error('Failed to fetch videos', err);
    }
  }, []);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo(id);
      await refreshVideos();
    } catch (err) {
      console.error('Failed to delete video', err);
    }
  };

  const handleUpdate = async (updatedVideo: VideoRecord) => {
    // API updates happen internally, but we can update local state to reflect it immediately
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
  };

  return {
    videos,
    refreshVideos,
    handleDelete,
    handleUpdate
  };
}
