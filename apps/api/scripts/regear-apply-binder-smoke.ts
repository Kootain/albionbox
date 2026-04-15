import assert from 'node:assert/strict'
import { parseUtcTimestamp, pickBestMatchFromEvents } from '../src/modules/cron_regear_apply_binder'

const d1 = parseUtcTimestamp('2026-04-15 12:45')
assert.ok(d1)
assert.equal(d1.toISOString(), '2026-04-15T12:45:00.000Z')

const d2 = parseUtcTimestamp('2026-04-15T12:45:00Z')
assert.ok(d2)
assert.equal(d2.toISOString(), '2026-04-15T12:45:00.000Z')

assert.equal(parseUtcTimestamp('not-a-date'), null)

const applyTimeMs = Date.parse('2026-04-15T12:45:00Z')

const events = [
  { Victim: { Name: 'Alice' }, TimeStamp: '2026-04-15T12:45:30Z', EventId: 1, BattleId: 10 },
  { Victim: { Name: 'Alice' }, TimeStamp: '2026-04-15T12:47:00Z', EventId: 2, BattleId: 10 },
  { Victim: { Name: 'Bob' }, TimeStamp: '2026-04-15T12:45:10Z', EventId: 3, BattleId: 11 },
  { Victim: { Name: 'Alice' }, TimeStamp: '2026-04-15T13:10:00Z', EventId: 4, BattleId: 12 },
] as any

const best = pickBestMatchFromEvents(events, 'Alice', applyTimeMs)
assert.ok(best)
assert.equal(best.eventId, '1')
assert.equal(best.battleId, '10')

const none = pickBestMatchFromEvents(events, 'Charlie', applyTimeMs)
assert.equal(none, null)

const notSameMinute = pickBestMatchFromEvents(events, 'Alice', Date.parse('2026-04-15T12:46:00Z'))
assert.equal(notSameMinute, null)

console.log('regear-apply-binder-smoke: ok')
