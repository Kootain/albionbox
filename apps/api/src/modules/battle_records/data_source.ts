export interface AlbionBattleVictim {
  Id: string
  Name: string
  GuildID: string
  Equipment: Record<string, unknown>
}

export interface AlbionBattleEvent {
  Victim: AlbionBattleVictim
  TimeStamp: string
}

export interface AlbionBattle {
  id: string
  startTime: string
  totalFame: number
  players: { id: string; guildId: string }[]
  events: AlbionBattleEvent[]
}

export interface BattleDataSource {
  fetchGuildBattles(albionGuildId: string, dbUrl: string, dbToken: string): Promise<AlbionBattle[]>
}

export class HttpBattleDataSource implements BattleDataSource {
  async fetchGuildBattles(albionGuildId: string, dbUrl: string, dbToken: string): Promise<AlbionBattle[]> {
    const url = `${dbUrl}/guildbattles?guildId=${encodeURIComponent(albionGuildId)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${dbToken}` },
    })
    if (!res.ok) throw new Error(`Battle DB fetch failed: ${res.status}`)
    return res.json() as Promise<AlbionBattle[]>
  }
}
