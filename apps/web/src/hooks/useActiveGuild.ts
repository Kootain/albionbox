import { useEffect, useState } from 'react';

const STORAGE_KEY = 'albionbox_active_guild_id';

export const useActiveGuild = () => {
  const [guildId, setGuildId] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '');

  useEffect(() => {
    if (guildId) {
      localStorage.setItem(STORAGE_KEY, guildId);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }, [guildId]);

  return {
    guildId,
    setGuildId,
  };
};
