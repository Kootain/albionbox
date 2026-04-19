import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Role } from '../../types';
import { X, UploadCloud } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useUploadQueue, UploadProvider } from '../../hooks/useUploadQueue';

interface UploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

const roles: Role[] = ['DPS', 'Tank', 'Healer', 'Support'];

export function UploadModal({ onClose, onUploaded }: UploadModalProps) {
  const { t } = useLanguage();
  const { addTasks, setOnUploadedCallback } = useUploadQueue();
  
  const [files, setFiles] = useState<File[]>([]);
  const [username, setUsername] = useState(() => localStorage.getItem('albion_bound_account') || '');
  const [role, setRole] = useState<Role>('DPS');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [provider, setProvider] = useState<UploadProvider>('volcengine');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOnUploadedCallback(() => onUploaded);
  }, [onUploaded, setOnUploadedCallback]);

  const handleClose = () => {
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !username.trim()) return;

    addTasks(files, { username, role, date, provider });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md p-6 bg-system-surface border border-system-border rounded-xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-system-dim hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">{t('upload.title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-system-dim uppercase tracking-[1px]">{t('upload.videoFile')}</label>
            
            <div 
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border border-system-border border-dashed rounded bg-system-bg hover:border-system-accent transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-1 text-center pointer-events-none">
                <UploadCloud className="mx-auto h-10 w-10 text-system-dim mb-3" />
                <div className="flex justify-center text-sm text-system-dim">
                  <span className="font-medium text-system-accent hover:text-system-accent-dark">
                    {t('upload.uploadFile')}
                  </span>
                  <p className="pl-1 text-[13px]">{t('upload.dragDrop')}</p>
                </div>
                <p className="text-xs text-system-dim/70">
                  {files.length > 0 
                    ? t('upload.filesSelected').replace('{count}', files.length.toString())
                    : 'MP4, WebM'}
                </p>
              </div>
              <input 
                id="file-upload" 
                ref={fileInputRef}
                type="file" 
                multiple
                className="hidden" 
                accept="video/mp4,video/x-m4v,video/*,video/webm" 
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }} 
                required={files.length === 0} 
              />
            </div>
            
            {files.length > 0 && (
              <div className="mt-2 max-h-24 overflow-y-auto bg-system-bg border border-system-border rounded p-2">
                <ul className="text-xs text-system-dim space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="truncate" title={f.name}>• {f.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-bold text-system-dim uppercase tracking-[1px]">{t('upload.username')}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={true}
              className="w-full bg-system-bg border border-system-border rounded px-3 py-2.5 text-white placeholder-system-dim/50 focus:outline-none focus:border-system-accent disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-bold text-system-dim uppercase tracking-[1px]">{t('upload.role')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-system-bg border border-system-border rounded px-3 py-2.5 text-white focus:outline-none focus:border-system-accent disabled:opacity-50"
            >
              {roles.map(r => (
                <option key={r} value={r}>{t(`role.${r.toLowerCase()}`)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-bold text-system-dim uppercase tracking-[1px]">{t('upload.date')}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-system-bg border border-system-border rounded px-3 py-2.5 text-white focus:outline-none focus:border-system-accent [color-scheme:dark] disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className="text-[11px] font-bold text-system-dim uppercase tracking-[1px]">Provider</label>
            <div className="flex items-center bg-system-bg border border-system-border rounded p-1">
              <button
                type="button"
                onClick={() => setProvider('volcengine')}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                  provider === 'volcengine' 
                    ? 'bg-system-accent text-black' 
                    : 'text-system-dim hover:text-white'
                }`}
              >
                火山引擎
              </button>
              <button
                type="button"
                onClick={() => setProvider('cloudflare')}
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                  provider === 'cloudflare' 
                    ? 'bg-system-accent text-black' 
                    : 'text-system-dim hover:text-white'
                }`}
              >
                Cloudflare
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={files.length === 0}
            className="w-full mt-6 bg-gradient-to-br from-system-accent to-system-accent-dark hover:opacity-90 text-black font-bold uppercase tracking-widest py-3 px-4 rounded disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
          >
            {t('upload.title')}
          </button>
        </form>
      </div>
    </div>
  );
}