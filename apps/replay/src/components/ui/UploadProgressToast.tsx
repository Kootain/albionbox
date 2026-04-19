import React, { useState } from 'react';
import { useUploadQueue } from '../../hooks/useUploadQueue';
import { X, CheckCircle2, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export function UploadProgressToast() {
  const { queue, clearTasks } = useUploadQueue();
  const { t } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);

  if (queue.length === 0) return null;

  const isAllCompleted = queue.every(t => t.status === 'success' || t.status === 'error');
  const successCount = queue.filter(t => t.status === 'success').length;
  const errorCount = queue.filter(t => t.status === 'error').length;
  const inProgressCount = queue.length - successCount - errorCount;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-system-surface border border-system-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
      <div className="bg-system-bg px-4 py-3 flex items-center justify-between border-b border-system-border">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {inProgressCount > 0 && <Loader2 className="w-4 h-4 animate-spin text-system-accent" />}
          {isAllCompleted 
            ? (t('upload.queueCompleted') || 'Upload Completed')
            : (t('upload.queueUploading') || `Uploading ({count} remaining)`).replace('{count}', inProgressCount.toString())
          }
        </h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-system-dim hover:text-white rounded"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {isAllCompleted && (
            <button 
              onClick={clearTasks}
              className="p-1 text-system-dim hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="max-h-64 overflow-y-auto p-2 space-y-2 bg-system-surface">
          {queue.map(task => (
            <div key={task.id} className="p-2 rounded bg-system-bg border border-system-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white truncate w-48" title={task.file.name}>
                  {task.file.name}
                </span>
                {task.status === 'idle' && <span className="text-[10px] text-system-dim">Waiting</span>}
                {task.status === 'uploading' && <span className="text-[10px] text-system-accent">{task.progress}%</span>}
                {task.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                {task.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              
              <div className="w-full bg-system-border rounded-full h-1.5 mt-2">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    task.status === 'success' ? 'bg-green-500' : 
                    task.status === 'error' ? 'bg-red-500' : 
                    'bg-system-accent'
                  }`} 
                  style={{ width: task.status === 'idle' ? '0%' : `${task.progress}%` }}
                />
              </div>
              {task.error && (
                <p className="text-[10px] text-red-400 mt-1 truncate" title={task.error}>
                  {task.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}