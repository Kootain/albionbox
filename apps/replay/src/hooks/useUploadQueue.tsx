import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import TTUploader from 'tt-uploader';
import { createVideo } from '../lib/api';
import { Role } from '../types';

export interface UploadItem {
  id: string;
  file: File;
  role: Role;
  date: string;
  username: string;
  duration?: number;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  startTime?: number;
  endTime?: number;
  uploadSpeed?: number;
}

interface UploadQueueContextType {
  queue: UploadItem[];
  addTasks: (files: File[], meta: { username: string; role: Role; date: string }) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  onUploadedCallback?: () => void;
  setOnUploadedCallback: (cb: () => void) => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [onUploadedCallback, setOnUploadedCallback] = useState<(() => void) | undefined>();
  const activeCountRef = useRef(0);
  const queueRef = useRef<UploadItem[]>([]);
  const MAX_CONCURRENT = 5;

  // Update ref to always have latest queue for processing loop
  queueRef.current = queue;

  const updateTask = useCallback((id: string, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const fetchStsToken = async () => {
    try {
      const res = await fetch('https://volc-auth.albionbox.com/api/vod/upload-token');
      if (res.ok) {
        const data = await res.json() as any;
        return data.data.token;
      }
    } catch (err) {
      console.warn("Could not fetch token from remote worker, using fallback mock token");
    }
    
    return {
      CurrentTime: new Date().toISOString(),
      ExpiredTime: new Date(Date.now() + 3600000).toISOString(),
      SessionToken: 'mock-session-token',
      AccessKeyID: 'mock-ak',
      SecretAccessKey: 'mock-sk'
    };
  };

  const processQueue = useCallback(() => {
    const availableSlots = MAX_CONCURRENT - activeCountRef.current;
    if (availableSlots <= 0) return;

    const idleTasks = queueRef.current.filter(t => t.status === 'idle').slice(0, availableSlots);
    if (idleTasks.length === 0) return;

    idleTasks.forEach(pendingTask => {
      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastProgressBytes = 0;
      let currentSpeed = 0;

      updateTask(pendingTask.id, { status: 'uploading', progress: 0, error: undefined, startTime, uploadSpeed: 0 });
      activeCountRef.current += 1;

      (async () => {
        try {
          const appId = import.meta.env.VITE_VOLC_APP_ID || '';
          const spaceName = import.meta.env.VITE_VOLC_SPACE_NAME || '';

          if (!appId || !spaceName) {
            throw new Error('Missing Volcengine configuration');
          }

          const stsToken = await fetchStsToken();

          const uploader = new TTUploader({
            userId: 'albion-user-' + Math.floor(Math.random() * 10000),
            appId: Number(appId),
            videoConfig: { spaceName }
          });

          await new Promise<void>((resolve) => {
            const fileKey = uploader.addFile({
              file: pendingTask.file,
              stsToken: stsToken,
              type: 'video'
            });

            uploader.on('complete', async (info: any) => {
              const vid = info.uploadResult?.Vid;
              // Extract duration directly from the API response payload
              const responseDuration = info.uploadResult?.SourceInfo?.Duration 
                ? Math.round(info.uploadResult.SourceInfo.Duration) 
                : pendingTask.duration;
                
              try {
                await createVideo({
                  vid: vid,
                  username: pendingTask.username,
                  role: pendingTask.role,
                  date: pendingTask.date,
                  duration: responseDuration,
                });
                updateTask(pendingTask.id, { status: 'success', progress: 100, endTime: Date.now() });
                if (onUploadedCallback) onUploadedCallback();
              } catch (err: any) {
                console.error('Failed to save metadata', err);
                updateTask(pendingTask.id, { status: 'error', error: 'Failed to save metadata', endTime: Date.now() });
              } finally {
                resolve();
              }
            });

            uploader.on('error', (info: any) => {
              console.error('Upload error', info.extra);
              updateTask(pendingTask.id, { status: 'error', error: info.extra?.message || 'Upload failed', endTime: Date.now() });
              resolve();
            });

            uploader.on('progress', (info: any) => {
              const now = Date.now();
              const currentBytes = (info.percent / 100) * pendingTask.file.size;
              const timeDiff = (now - lastProgressTime) / 1000;
              
              if (timeDiff >= 1 || info.percent === 100) {
                if (timeDiff > 0) {
                  currentSpeed = (currentBytes - lastProgressBytes) / timeDiff;
                }
                lastProgressTime = now;
                lastProgressBytes = currentBytes;
              }

              updateTask(pendingTask.id, { 
                progress: Math.round(info.percent),
                uploadSpeed: currentSpeed
              });
            });

            uploader.start(fileKey);
          });
        } catch (err: any) {
          console.error('Failed to process task', err);
          updateTask(pendingTask.id, { status: 'error', error: err.message || 'Failed to process task', endTime: Date.now() });
        } finally {
          activeCountRef.current -= 1;
          processQueue(); // trigger next task
        }
      })();
    });
  }, [updateTask, onUploadedCallback]);

  useEffect(() => {
    processQueue();
  }, [queue, processQueue]);

  const addTasks = useCallback((files: File[], meta: { username: string; role: Role; date: string }) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: uuidv4(),
      file,
      role: meta.role,
      date: meta.date,
      username: meta.username,
      progress: 0,
      status: 'idle'
    }));
    
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const removeTask = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearTasks = useCallback(() => {
    setQueue([]);
  }, []);

  return (
    <UploadQueueContext.Provider value={{ queue, addTasks, removeTask, clearTasks, onUploadedCallback, setOnUploadedCallback }}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within a UploadQueueProvider');
  }
  return context;
}
