import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { updateVideo } from '../../lib/api';
import { VideoRecord, Role } from '../../types';

interface EditVideoModalProps {
  video: VideoRecord;
  onClose: () => void;
  onUpdated: (video: VideoRecord) => void;
}

export function EditVideoModal({ video, onClose, onUpdated }: EditVideoModalProps) {
  const { t } = useLanguage();
  const [role, setRole] = useState<Role>(video.role as Role);
  const [date, setDate] = useState(video.date);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === video.role && date === video.date) {
      onClose();
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await updateVideo(video.id, { role, date });
      onUpdated({ ...video, role, date });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update video');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-system-surface w-full max-w-md rounded-xl border border-system-border shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-system-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">{t('edit.title') || 'Edit Video'}</h2>
          <button 
            onClick={onClose}
            className="text-system-dim hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-system-dim uppercase tracking-widest mb-2">
                {t('upload.role') || 'Role'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['DPS', 'Tank', 'Healer', 'Support'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded text-sm font-bold uppercase transition-all ${
                      role === r 
                        ? 'bg-system-accent text-black shadow-[0_0_15px_rgba(255,165,0,0.3)]' 
                        : 'bg-system-bg text-system-dim border border-system-border hover:border-system-accent/50'
                    }`}
                  >
                    {t(`role.${r.toLowerCase()}`) || r}
                  </button>
                ))}
              </div>
            <div>
              <label className="block text-xs font-bold text-system-dim uppercase tracking-widest mb-2">
                {t('upload.date') || 'Battle Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-system-bg border border-system-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-system-accent"
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-system-dim hover:text-white uppercase tracking-wider transition-colors"
            >
              {t('app.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-system-accent text-black rounded text-sm font-bold uppercase tracking-widest hover:bg-system-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? (t('upload.saving') || 'Saving...') : (t('player.save') || 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}