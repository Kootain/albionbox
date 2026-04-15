import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../users'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

async function kookRequest(c: any, apiPath: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`https://www.kookapp.cn/api/v3${apiPath}`)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined) continue
    url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bot ${c.env.KOOK_BOT_TOKEN}`,
    },
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    return c.json({ error: data ?? res.statusText }, res.status)
  }

  return c.json(data)
}

const listGuildsHandler = factory.createHandlers(async (c) => {
  return kookRequest(c, '/guild/list')
})

const listChannelsHandler = factory.createHandlers(
  zValidator('param', z.object({ guildId: z.string().min(1) })),
  async (c) => {
    const { guildId } = c.req.valid('param')
    return kookRequest(c, '/channel/list', { guild_id: guildId })
  }
)

const listMessagesHandler = factory.createHandlers(
  zValidator('param', z.object({ channelId: z.string().min(1) })),
  zValidator('query', z.object({
    before: z.string().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })),
  async (c) => {
    const { channelId } = c.req.valid('param')
    const { before, pageSize } = c.req.valid('query')
    return kookRequest(c, '/message/list', {
      target_id: channelId,
      page_size: pageSize ?? 50,
      ...(before ? { msg_id: before, flag: 'before' } : {}),
    })
  }
)

const routes = router
  .use('*', authMiddleware)
  .get('/guilds', ...listGuildsHandler)
  .get('/guilds/:guildId/channels', ...listChannelsHandler)
  .get('/channels/:channelId/messages', ...listMessagesHandler)

export { routes as kookRouter }
