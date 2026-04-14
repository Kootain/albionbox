import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { OfficialApiBattleDataSource } from './data_source'
import type { AppContext } from '../../context'
import { AlbionApiClient } from '../../lib/albion-sdk'
import { AlbionServer } from '@albionbox/shared'

const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()

const albionSdkMap = new Map([
  ['asia', new AlbionApiClient(AlbionServer.ASIA)],
  ['us', new AlbionApiClient(AlbionServer.US)],
  ['eu', new AlbionApiClient(AlbionServer.EU)]
]);

const searchAlbionHandler = factory.createHandlers(
  zValidator('query', z.object({
    q: z.string().min(1),
    server: z.enum(['asia', 'us', 'eu']).optional().default('asia')
  })),
  async (c) => {
    const { q, server } = c.req.valid('query')
    try {
      const res = await albionSdkMap.get(server)?.search(q)
      return c.json(res)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  }
)

const getAlbionBattlesDirectHandler = factory.createHandlers(
  zValidator('query', z.object({
    guildId: z.string().min(1),
    server: z.enum(['asia', 'us', 'eu']).optional().default('asia'),
    offset: z.coerce.number().min(0).optional().default(0),
    limit: z.coerce.number().min(1).max(51).optional().default(51)
  })),
  async (c) => {
    const { guildId, server, offset, limit } = c.req.valid('query')
    try {
      const ds = new OfficialApiBattleDataSource()
      const battles = await ds.getRecentGuildBattles(guildId, server as any, offset, limit)
      return c.json(battles)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  }
)

const getAlbionBattleEventsDirectHandler = factory.createHandlers(
  zValidator('query', z.object({
    battleId: z.string().min(1),
    server: z.enum(['asia', 'us', 'eu']).optional().default('asia'),
    offset: z.coerce.number().min(0).optional().default(0),
    limit: z.coerce.number().min(1).max(51).optional().default(51)
  })),
  async (c) => {
    const { battleId, server, offset, limit } = c.req.valid('query')
    try {
      const ds = new OfficialApiBattleDataSource()
      const events = await ds.getBattleEvents(battleId, server as any, offset, limit)
      return c.json(events)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  }
)

const getAlbionEventDirectHandler = factory.createHandlers(
  zValidator('param', z.object({
    id: z.string().min(1)
  })),
  zValidator('query', z.object({
    server: z.enum(['asia', 'us', 'eu']).optional().default('asia')
  })),
  async (c) => {
    const { id } = c.req.valid('param')
    const { server } = c.req.valid('query')
    try {
      const ds = new OfficialApiBattleDataSource()
      const event = await ds.getEvent(id, server as any)
      return c.json(event)
    } catch (e: any) {
      return c.json({ error: e.message }, 500)
    }
  }
)

const routes = router
      // TEMPORARY DIRECT ALBION PROXY ROUTES (No auth for testing frontend integration)
      .get('/test/albion/search', ...searchAlbionHandler)
      .get('/test/albion/battles', ...getAlbionBattlesDirectHandler)
      .get('/test/albion/events', ...getAlbionBattleEventsDirectHandler)
      .get('/test/albion/events/:id', ...getAlbionEventDirectHandler)
      .use('*', authMiddleware)

export { routes as battleRecordsRouter }
