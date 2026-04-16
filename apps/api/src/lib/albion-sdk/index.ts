import { AlbionServer, AlbionOfficialBattle, AlbionOfficialEvent, AlbionSearchResult } from '@albionbox/shared';


export const ALBION_DOMAINS: Record<AlbionServer, string> = {
  [AlbionServer.ASIA]: 'https://gameinfo-sgp.albiononline.com',
  [AlbionServer.US]: 'https://gameinfo.albiononline.com',
  [AlbionServer.EU]: 'https://gameinfo-ams.albiononline.com',
};


export class AlbionApiClient {
  constructor(private readonly server: AlbionServer = AlbionServer.ASIA) {}

  private get baseUrl() {
    return ALBION_DOMAINS[this.server];
  }

  async getGuildBattles(guildId: string, offset = 0, limit = 50): Promise<AlbionOfficialBattle[]> {
    const url = `${this.baseUrl}/api/gameinfo/battles?offset=${offset}&limit=${limit}&sort=recent&guildId=${guildId}&timestamp=${Date.now()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Albion Official Battles: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<AlbionOfficialBattle[]>;
  }

  async getBattleEvents(battleId: string, offset = 0, limit = 50): Promise<AlbionOfficialEvent[]> {
    const url = `${this.baseUrl}/api/gameinfo/events/battle/${battleId}?offset=${offset}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Albion Battle Events: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<AlbionOfficialEvent[]>;
  }

  async getEvent(eventId: string): Promise<AlbionOfficialEvent> {
    const url = `${this.baseUrl}/api/gameinfo/events/${eventId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Albion Event: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<AlbionOfficialEvent>;
  }

  async search(query: string): Promise<AlbionSearchResult> {
    const url = `${this.baseUrl}/api/gameinfo/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to search Albion API: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<AlbionSearchResult>;
  }
}
