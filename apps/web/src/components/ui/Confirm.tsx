import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../ui';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    resolver?.resolve(true);
    setOptions(null);
    setResolver(null);
  };

  const handleCancel = () => {
    resolver?.resolve(false);
    setOptions(null);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {options && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCancel}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
              className="relative w-full max-w-sm bg-black-card border border-black-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-full flex-shrink-0",
                    options.danger ? "bg-rose-500/10 text-rose-500" : "bg-gold/10 text-gold"
                  )}>
                    {options.danger ? <AlertCircle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-bold text-white mb-2 leading-none">
                      {options.title || t('common.confirm', { defaultValue: 'Confirm Action' })}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {options.message}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-black-bg/50 border-t border-black-border/50 justify-end">
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-black-border/50 transition-colors"
                >
                  {options.cancelText || t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={cn(
                    "px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg",
                    options.danger 
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" 
                      : "bg-gold hover:bg-gold-hover text-black shadow-gold/20"
                  )}
                >
                  {options.confirmText || t('common.confirm', { defaultValue: 'Confirm' })}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}
