import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { AlbionSearchResultPlayer } from '@albionbox/shared';

export function AlbionPlayerSearch({
  guildId,
  onSelect,
  isSelected,
  placeholder,
  autoFocus,
}: {
  guildId: string;
  onSelect: (player: AlbionSearchResultPlayer) => void;
  isSelected?: (player: AlbionSearchResultPlayer) => boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AlbionSearchResultPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      if (!query.trim() || !guildId) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.guilds[':id'].albion.search.$get({ param: { id: guildId }, query: { q: query } });
        if (!res.ok) return;
        const data = await res.json() as any;
        if (aborted) return;
        setResults(data.players || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!aborted) setIsSearching(false);
      }
    };

    run();
    return () => { aborted = true; };
  }, [guildId, query]);

  return (
    <div>
      <div className="relative mb-4">
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder={placeholder ?? t('guild_dashboard.settings.search', { defaultValue: 'Search player by name...' })}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-black-bg border border-black-border rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-gold/50"
        />
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        {isSearching && <Loader2 className="w-4 h-4 text-gold animate-spin absolute right-3 top-3" />}
      </div>

      <div className="space-y-2">
        {results.map(player => {
          const selected = isSelected ? isSelected(player) : false;
          return (
            <div
              key={player.Id}
              onClick={() => !selected && onSelect(player)}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-colors",
                selected
                  ? "bg-emerald-500/10 border border-emerald-500/20 cursor-default"
                  : "hover:bg-black-bg border border-transparent cursor-pointer group"
              )}
            >
              <div>
                <div className={cn("text-sm font-bold", selected ? "text-emerald-500" : "text-white")}>{player.Name}</div>
                <div className="text-xs text-slate-500 font-bold">{player.GuildName || 'No Guild'}</div>
              </div>
              {selected ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <button className="text-xs font-bold text-gold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</button>
              )}
            </div>
          );
        })}

        {query && !isSearching && results.length === 0 && (
          <div className="text-center text-sm font-bold uppercase tracking-widest text-slate-500 py-4">No players found</div>
        )}
      </div>
    </div>
  );
}

