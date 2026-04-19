import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createVideo } from '../lib/api';
import { Role } from '../types';
import { createVolcengineUploader, createCloudflareUploader, VideoUploader } from '../lib/uploader';

export type UploadProvider = 'volcengine' | 'cloudflare';

export interface UploadItem {
  id: string;
  file: File;
  role: Role;
  date: string;
  username: string;
  provider: UploadProvider;
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
  addTasks: (files: File[], meta: { username: string; role: Role; date: string; provider: UploadProvider }) => void;
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

  const processQueue = useCallback(() => {
    const availableSlots = MAX_CONCURRENT - activeCountRef.current;
    if (availableSlots <= 0) return;

    const idleTasks = queueRef.current.filter(t => t.status === 'idle').slice(0, availableSlots);
    if (idleTasks.length === 0) return;

    idleTasks.forEach(pendingTask => {
      const startTime = Date.now();

      updateTask(pendingTask.id, { status: 'uploading', progress: 0, error: undefined, startTime, uploadSpeed: 0 });
      activeCountRef.current += 1;

      (async () => {
        try {
          const provider = pendingTask.provider;
          
          let uploader: VideoUploader;
          
          const options = {
            file: pendingTask.file,
            onProgress: (percent: number, speedBytesPerSec: number) => {
              updateTask(pendingTask.id, { 
                progress: percent,
                uploadSpeed: speedBytesPerSec
              });
            },
            onSuccess: async (vid: string, duration?: number) => {
              const finalDuration = duration || pendingTask.duration;
              try {
                await createVideo({
                  vid: vid,
                  username: pendingTask.username,
                  role: pendingTask.role,
                  date: pendingTask.date,
                  duration: finalDuration,
                });
                updateTask(pendingTask.id, { status: 'success', progress: 100, endTime: Date.now() });
                if (onUploadedCallback) onUploadedCallback();
              } catch (err: any) {
                console.error('Failed to save metadata', err);
                updateTask(pendingTask.id, { status: 'error', error: 'Failed to save metadata', endTime: Date.now() });
              }
            },
            onError: (error: string) => {
              console.error('Upload error', error);
              updateTask(pendingTask.id, { status: 'error', error, endTime: Date.now() });
            }
          };

          if (provider === 'cloudflare') {
            uploader = createCloudflareUploader(options);
          } else {
            uploader = createVolcengineUploader(options);
          }

          await uploader.start();

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

  const addTasks = useCallback((files: File[], meta: { username: string; role: Role; date: string; provider: UploadProvider }) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: uuidv4(),
      file,
      role: meta.role,
      date: meta.date,
      username: meta.username,
      provider: meta.provider,
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
