import React, { useState, useEffect } from 'react';
import { Upload, User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { cn } from '../../lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  onOpenUpload: () => void;
  boundAccount?: string | null;
}

export function AppShell({ children, onOpenUpload, boundAccount }: AppShellProps) {
  const { t, lang, toggleLang } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 60);
  };

  return (
    <div className="h-screen bg-system-bg text-system-text font-sans selection:bg-system-accent/30 overflow-hidden flex flex-col relative">
      
      {/* Floating Action Button (FAB) - Smooth independent entrance */}
      <div className={cn(
        "fixed right-6 top-6 z-[50] transition-all duration-300 ease-out shadow-2xl rounded-full",
        isScrolled ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" : "-translate-y-4 opacity-0 scale-90 pointer-events-none"
      )}>
        <button
          onClick={onOpenUpload}
          className="w-14 h-14 bg-system-accent text-black rounded-full flex items-center justify-center hover:bg-system-accent-dark hover:scale-110 active:scale-95 transition-all outline-none border-[3px] border-[rgba(255,255,255,0.1)] custom-shadow"
          title={t('app.uploadBtn')}
        >
          <Upload className="w-6 h-6 translate-y-[-1px]" strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Content Area handles its own scroll */}
      <main onScroll={handleScroll} className="flex-1 overflow-y-auto bg-system-bg relative scroll-smooth">
        
        {/* Top Header - Now inside main so it scrolls away naturally */}
        <header className="bg-system-surface border-b border-system-border shrink-0 flex items-center justify-between px-6 h-[90px]">
          {/* Left: Branding & Local Note */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded bg-system-accent text-black font-bold w-10 h-10 text-xl">
                ⛨
              </div>
              <div className="font-extrabold tracking-widest text-white uppercase text-2xl">
                {t('app.title')}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {boundAccount && (
              <div className="hidden sm:flex items-center gap-2 bg-system-bg border border-system-border rounded px-3 py-1.5 shadow-inner">
                <User className="w-4 h-4 text-system-accent" />
                <span className="text-[12px] font-bold text-white uppercase tracking-wider">{boundAccount}</span>
              </div>
            )}

            <button 
              onClick={toggleLang}
              className="px-2 py-1 border border-system-border rounded hover:bg-system-bg transition-colors text-[12px] font-bold text-system-dim hover:text-white"
            >
              {lang === 'en' ? '中文' : 'EN'}
            </button>
            
            <button
              onClick={onOpenUpload}
              className="bg-system-accent text-black font-extrabold rounded flex items-center justify-center h-[44px] px-5 gap-2 uppercase tracking-wider transition-colors hover:bg-system-accent-dark cursor-pointer shadow-lg hover:shadow-xl"
            >
               <Upload className="w-5 h-5 translate-y-[-1px]" strokeWidth={2.5} />
               <span className="text-[13px]">{t('app.uploadBtn')}</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-6 md:p-8 pb-32">
          {children}
        </div>
      </main>
    </div>
  );
}
