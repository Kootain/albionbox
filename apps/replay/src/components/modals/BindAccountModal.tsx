import React, { useState, useEffect } from 'react';
import { Search, Loader2, User, Server } from 'lucide-react';
import { searchPlayer } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';

interface BindAccountModalProps {
  onBound: (username: string, server: string) => void;
}

type AlbionSearchResultPlayer = {
  Id: string;
  Name: string;
  GuildName: string;
  KillFame: number;
};

export function BindAccountModal({ onBound }: BindAccountModalProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [server, setServer] = useState<'asia' | 'us' | 'eu'>('asia');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AlbionSearchResultPlayer[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery, server);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, server]);

  const performSearch = async (query: string, server: 'asia' | 'us' | 'eu') => {
    setIsSearching(true);
    try {
      const data = await searchPlayer(query, server);
      setSearchResults(data.players || []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBind = (player: AlbionSearchResultPlayer) => {
    localStorage.setItem('albion_bound_account', player.Name);
    localStorage.setItem('albion_bound_server', server);
    onBound(player.Name, server);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-system-bg border border-system-border rounded-lg w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-system-accent/20 text-system-accent mb-4">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest">{t('bind.title')}</h2>
          <p className="text-sm text-system-dim mt-2">{t('bind.desc')}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-system-dim uppercase tracking-widest mb-2">{t('bind.server')}</label>
            <div className="flex gap-2">
              {(['asia', 'us', 'eu'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setServer(s)}
                  className={`flex-1 py-2 px-3 rounded text-xs font-bold uppercase tracking-wider border transition-colors ${
                    server === s 
                      ? 'bg-system-accent text-black border-system-accent' 
                      : 'bg-black text-system-dim border-system-border hover:border-system-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Server className="w-3 h-3" />
                    {s}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-system-dim uppercase tracking-widest mb-2">{t('bind.charName')}</label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder={t('bind.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-system-border rounded pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-system-accent transition-colors"
              />
              <Search className="w-4 h-4 text-system-dim absolute left-3 top-3.5" />
              {isSearching && <Loader2 className="w-4 h-4 text-system-accent animate-spin absolute right-3 top-3.5" />}
            </div>
          </div>

          <div className="mt-4 max-h-[240px] overflow-y-auto custom-scrollbar space-y-2">
            {searchResults.map(player => (
              <div 
                key={player.Id}
                onClick={() => handleBind(player)}
                className="flex items-center justify-between p-3 bg-black border border-system-border rounded hover:border-system-accent cursor-pointer group transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-system-accent transition-colors">{player.Name}</div>
                  <div className="text-xs text-system-dim mt-0.5">{player.GuildName || t('bind.noGuild')} • {(player.KillFame / 1000000).toFixed(1)}M Kill Fame</div>
                </div>
                <button className="text-xs font-bold text-system-accent uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('bind.btn')}
                </button>
              </div>
            ))}
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center text-xs text-system-dim py-4 uppercase tracking-widest">
                {t('bind.notFound')}
              </div>
            )}
            {searchQuery.length < 2 && (
              <div className="text-center text-xs text-system-dim py-4 uppercase tracking-widest">
                {t('bind.minChars')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}