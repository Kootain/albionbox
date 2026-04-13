import { AlbionOfficialBattle, AlbionOfficialEvent, AlbionServer } from '@albionbox/shared'
import { AlbionApiClient } from '../../lib/albion-sdk'



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

// New unified battle report data source interface
export interface BattleReportDataSource {
  getRecentGuildBattles(guildId: string, server: AlbionServer, offset?: number, limit?: number): Promise<AlbionOfficialBattle[]>
  getBattleEvents(battleId: string, server: AlbionServer, offset?: number, limit?: number): Promise<AlbionOfficialEvent[]>
}

export class OfficialApiBattleDataSource implements BattleReportDataSource {
  async getRecentGuildBattles(guildId: string, server: AlbionServer, offset = 0, limit = 51): Promise<AlbionOfficialBattle[]> {
    const client = new AlbionApiClient(server)
    return client.getGuildBattles(guildId, offset, limit)
  }

  async getBattleEvents(battleId: string, server: AlbionServer, offset = 0, limit = 51): Promise<AlbionOfficialEvent[]> {
    const client = new AlbionApiClient(server)
    return client.getBattleEvents(battleId, offset, limit)
  }
}
