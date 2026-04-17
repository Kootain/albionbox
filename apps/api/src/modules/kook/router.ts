import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../users'
import type { AppContext } from '../../context'
import { drizzle } from 'drizzle-orm/d1'
import { guildSettings } from '@albionbox/db'
import { eq } from 'drizzle-orm'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

async function kookGet(c: any, apiPath: string, query?: Record<string, string | number | undefined>) {
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

async function kookPostForm(c: any, apiPath: string, body: Record<string, string>) {
  const url = new URL(`https://www.kookapp.cn/api/v3${apiPath}`)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bot ${c.env.KOOK_BOT_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
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

async function kookPostMultipart(c: any, apiPath: string, form: FormData) {
  const url = new URL(`https://www.kookapp.cn/api/v3${apiPath}`)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bot ${c.env.KOOK_BOT_TOKEN}`,
    },
    body: form,
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
  return kookGet(c, '/guild/list')
})

const listChannelsHandler = factory.createHandlers(
  zValidator('param', z.object({ guildId: z.string().min(1) })),
  async (c) => {
    const { guildId } = c.req.valid('param')
    const db = drizzle(c.env.DB)
    const settings = await db.select({ kookGuildId: guildSettings.kookGuildId }).from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
    
    if (!settings?.kookGuildId) {
      return c.json({ code: 0, message: "No kook guild bound", data: { items: [] } })
    }

    const res = await kookGet(c, '/channel/list', { guild_id: settings.kookGuildId })
    const data = await res.json() as any
    if (data?.data?.items) {
      data.data.items = data.data.items.map((item: any) => ({ ...item, name: `[Kook] ${item.name}` }))
    }
    return c.json(data)
  }
)

const listGuildUsersHandler = factory.createHandlers(
  zValidator('param', z.object({ guildId: z.string().min(1) })),
  async (c) => {
    const { guildId } = c.req.valid('param')
    const db = drizzle(c.env.DB)
    const settings = await db.select({ kookGuildId: guildSettings.kookGuildId }).from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
    
    if (!settings?.kookGuildId) {
      return c.json({ code: 0, message: "No kook guild bound", data: { items: [] } })
    }

    const res = await kookGet(c, '/guild/user-list', { guild_id: settings.kookGuildId })
    const data = await res.json() as any
    if (data?.data?.items) {
      data.data.items = data.data.items.map((item: any) => ({ ...item, nickname: `[Kook] ${item.nickname || item.username}`, username: `[Kook] ${item.username}` }))
    }
    return c.json(data)
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
    return kookGet(c, '/message/list', {
      target_id: channelId,
      page_size: pageSize ?? 50,
      ...(before ? { msg_id: before, flag: 'before' } : {}),
    })
  }
)

const addReactionHandler = factory.createHandlers(
  zValidator('param', z.object({ msgId: z.string().min(1) })),
  zValidator('json', z.object({ emoji: z.string().min(1) })),
  async (c) => {
    const { msgId } = c.req.valid('param')
    const { emoji } = c.req.valid('json')
    return kookPostForm(c, '/message/add-reaction', { msg_id: msgId, emoji })
  }
)

const deleteReactionHandler = factory.createHandlers(
  zValidator('param', z.object({ msgId: z.string().min(1) })),
  zValidator('json', z.object({ emoji: z.string().min(1) })),
  async (c) => {
    const { msgId } = c.req.valid('param')
    const { emoji } = c.req.valid('json')
    return kookPostForm(c, '/message/delete-reaction', { msg_id: msgId, emoji })
  }
)

const sendMessageHandler = factory.createHandlers(
  zValidator('json', z.object({
    channelId: z.string().min(1),
    content: z.string().min(1),
    type: z.coerce.number().int().optional(),
  })),
  async (c) => {
    const { channelId, content, type } = c.req.valid('json')
    return kookPostForm(c, '/message/create', {
      target_id: channelId,
      content,
      type: String(type ?? 9),
    })
  }
)

const listGuildEmojisHandler = factory.createHandlers(
  zValidator('query', z.object({
    guildId: z.string().min(1),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })),
  async (c) => {
    const { guildId, page, pageSize } = c.req.valid('query')
    return kookGet(c, '/guild-emoji/list', {
      guild_id: guildId,
      page: page ?? 1,
      page_size: pageSize ?? 50,
    })
  }
)

const createGuildEmojiHandler = factory.createHandlers(async (c) => {
  const fd = await c.req.raw.formData()
  const guildId = (fd.get('guildId') ?? fd.get('guild_id') ?? '').toString().trim()
  const name = (fd.get('name') ?? '').toString().trim()
  const emoji = fd.get('emoji')

  if (!guildId) {
    return c.json({ error: 'Missing guildId' }, 400)
  }

  if (!(emoji instanceof File)) {
    return c.json({ error: 'Missing emoji file' }, 400)
  }

  if (emoji.size > 256 * 1024) {
    return c.json({ error: 'Emoji file too large (max 256KB)' }, 400)
  }

  const out = new FormData()
  out.set('guild_id', guildId)
  if (name) out.set('name', name)
  out.set('emoji', emoji, emoji.name)
  return kookPostMultipart(c, '/guild-emoji/create', out)
})

const deleteGuildEmojiHandler = factory.createHandlers(
  zValidator('json', z.object({ emojiId: z.string().min(1) }).or(z.object({ id: z.string().min(1) }))),
  async (c) => {
    const body = c.req.valid('json') as { emojiId?: string; id?: string }
    const id = body.emojiId ?? body.id
    return kookPostForm(c, '/guild-emoji/delete', { id: String(id) })
  }
)

const routes = router
  .use('*', authMiddleware)
  .get('/guilds', ...listGuildsHandler)
  .get('/guilds/:guildId/channels', ...listChannelsHandler)
  .get('/guilds/:guildId/users', ...listGuildUsersHandler)
  .get('/channels/:channelId/messages', ...listMessagesHandler)
  .post('/messages/:msgId/reactions', ...addReactionHandler)
  .delete('/messages/:msgId/reactions', ...deleteReactionHandler)
  .post('/messages/send', ...sendMessageHandler)
  .get('/guilds/emojis', ...listGuildEmojisHandler)
  .post('/guilds/emojis', ...createGuildEmojiHandler)
  .delete('/guilds/emojis', ...deleteGuildEmojiHandler)

export { routes as kookRouter }
