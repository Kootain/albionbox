import { AlbionApiClient } from "@/lib/albion-sdk"
import { AlbionOfficialBattle, AlbionOfficialEvent } from "@albionbox/shared"

export type applyDetail = {
    victimName: string
    victimGuild: string
    victimIP: number
    killerName: string
    killerGuild: string
    killerIP: number
    killFame: number
    timestamp: string
    mapName: string
    assists: number
}

export function parseUtcTimestamp(value: string): Date | null {
    const raw = value.trim()
    const isoString = `${raw.replace(' ', 'T')}Z`;

    const iso = new Date(isoString);
    if (!Number.isNaN(iso)) return new Date(iso)

    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (!m) return null
    const [, y, mo, d, h, mi, s] = m
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? '0')))
    if (Number.isNaN(date.getTime())) return null
    return date
}


const maxPages = 10
const pageSize = 50
const bufferMs = 1 * 60 * 1000 // 1分钟 buffer 因为截图中的时间到分钟，没有秒

export async function getBattlesBeforeTime(client: AlbionApiClient, guildId: string, time: number): Promise<AlbionOfficialBattle[]> {
    const results: AlbionOfficialBattle[] = []
    let endFlag = false // 找到后不立马结束，再翻一页
    for (let page = 0; page < maxPages; page += 1) {
        if (endFlag) break
        const offset = page * pageSize
        const pageItems = await client.getGuildBattles(guildId, offset, pageSize)
        if (!pageItems || pageItems.length === 0) break
        results.push(...pageItems)
        const last = pageItems[pageItems.length - 1]
        const lastStartMs = Date.parse(last.startTime)
        if (!Number.isNaN(lastStartMs) && lastStartMs - bufferMs < time) {
            endFlag = true
        }
        if (pageItems.length < pageSize) break
    }
    return results
}

function zeroOutSecondsAndMs(timestamp: number | undefined | null): number {
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
    return 0;
  }
  return Math.floor(timestamp / 60000) * 60000;
}

export function selectBattlesByTime(battles: AlbionOfficialBattle[], deathTimes: number[]): AlbionOfficialBattle[] {
    const results: AlbionOfficialBattle[] = []
    for (const deathTime of deathTimes) {
        for (const battle of battles) {
            const startMs = Date.parse(battle.startTime)
            const endMs = Date.parse(battle.endTime)
            if ((startMs - bufferMs <= deathTime) &&  (deathTime<=endMs + bufferMs)) {
                results.push(battle)
            }
        }
    }
    const uniqueBattles = [...new Map(results.map(i => [i.id, i])).values()];
    return uniqueBattles
}

export async function getBattlesEvents(client: AlbionApiClient, battles: AlbionOfficialBattle[]): Promise<AlbionOfficialEvent[]> {
    const events = await Promise.all(battles.map(async (battle) => {
        const page = Math.ceil(battle.totalKills / 50)
        return Promise.all(Array.from({ length: page }, (_, i) => client.getBattleEvents(battle.id.toString(), i * pageSize, pageSize)))
    }))
    return events.flat().flat()
}

export function match(event: applyDetail, events: AlbionOfficialEvent[]): AlbionOfficialEvent | null {
    const findVictimName = events.filter((e) => e.Victim.Name.toLocaleLowerCase() == event.victimName.toLocaleLowerCase())
    const findKilltime = events.filter((e) => zeroOutSecondsAndMs(Date.parse(e.TimeStamp)) == parseUtcTimestamp(event.timestamp)?.getTime())
    console.log(`findVictimName: ${JSON.stringify(findVictimName.map((e) => e.EventId))}, findKilltime: ${JSON.stringify(findKilltime.map((e) => e.EventId))}`)
    const findMatch = events.filter(e=>(e.Victim.Name.toLocaleLowerCase() == event.victimName.toLocaleLowerCase() && zeroOutSecondsAndMs(Date.parse(e.TimeStamp)) == parseUtcTimestamp(event.timestamp)?.getTime()))
    if (findMatch.length === 0 || findMatch.length > 1) {
        console.log(`miss match found for ${event.victimName} at ${event.timestamp} ${JSON.stringify(findMatch.map((e) => e.EventId))}`)
        return null
    }
    return findMatch[0]
}

