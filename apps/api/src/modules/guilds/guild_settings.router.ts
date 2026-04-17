import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { UpdateGuildSettingsSchema, AlbionServer } from '@albionbox/shared'
import { guildSettings, guilds } from '@albionbox/db'
import { authMiddleware } from '../users'
import { guildPermMiddleware } from '../permissions'
import { AlbionApiClient } from '../../lib/albion-sdk'
import { z } from 'zod'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const getSettingsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']), 
  async (c) => {
    const { id: guildId } = c.req.param() as Record<string, string>
    const db = drizzle(c.env.DB)
    
    const settings = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
    
    return c.json(settings || {
      guildId,
      regearConfig: { allowedSlots: ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'] },
      chestRooms: [{ id: 'default', name: 'Main Room', width: 10, height: 10, assignments: [] }],
      updatedAt: new Date().toISOString()
    })
  }
)

const updateSettingsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:manage']),
  zValidator('json', UpdateGuildSettingsSchema),
  async (c) => {
    const { id: guildId } = c.req.param() as Record<string, string>
    const data = c.req.valid('json')
    const db = drizzle(c.env.DB)
    const now = new Date().toISOString()
    
    const setValues: any = { updatedAt: now }
    if (data.regearConfig !== undefined) setValues.regearConfig = data.regearConfig
    if (data.chestRooms !== undefined) setValues.chestRooms = data.chestRooms
    if (data.kookGuildId !== undefined) setValues.kookGuildId = data.kookGuildId

    await db.insert(guildSettings).values({
      guildId,
      regearConfig: data.regearConfig || { allowedSlots: ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape'] },
      chestRooms: data.chestRooms || [{ id: 'default', name: 'Main Room', width: 10, height: 10, assignments: [] }],
      kookGuildId: data.kookGuildId,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: guildSettings.guildId,
      set: setValues
    })
    
    return c.json({ success: true })
  }
)

const getChestsHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  async (c) => {
    const { id: guildId } = c.req.param() as Record<string, string>
    const db = drizzle(c.env.DB)
    
    const settings = await db.select({ chestRooms: guildSettings.chestRooms }).from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
    return c.json(settings?.chestRooms || [])
  }
)

const searchAlbionPlayerHandler = factory.createHandlers(
  guildPermMiddleware(['guild:view']),
  zValidator('query', z.object({ q: z.string().min(1), server: z.enum(['asia', 'eu', 'us']).optional() })),
  async (c) => {
    const { id: guildId } = c.req.param() as Record<string, string>
    let { q, server } = c.req.valid('query')
    if (!server) {
      const db = drizzle(c.env.DB)
      const guild = await db.select({ server: guilds.server }).from(guilds).where(eq(guilds.id, guildId)).get()
      if (!guild) return c.json({ error: '工会不存在' }, 404)
      server = guild.server
    }
    
    const client = new AlbionApiClient(server as AlbionServer)
    const result = await client.search(q)
    return c.json(result)
  }
)

const routes = router
  .use('*', authMiddleware)
  .get('/:id/settings', ...getSettingsHandler)
  .put('/:id/settings', ...updateSettingsHandler)
  .get('/:id/chests', ...getChestsHandler)
  .get('/:id/albion/search', ...searchAlbionPlayerHandler)

export { routes as guildSettingsRouter }
