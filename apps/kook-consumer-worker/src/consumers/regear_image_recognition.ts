import { parseKillEventFromImage, type KillEventParsed } from '@albionbox/shared/utils/api_image'
import type { Consumer } from '../consumer.js'
import type { Bindings } from '../bindings.js'
import { RestClient } from '@kookapp/js-sdk'

export type KookMessageEventData = {
  msg_id?: string
  type?: number
  content?: unknown
  target_id?: string
  extra?: {
    guild_id?: string
    author?: {
      id?: string
      username?: string
      nickname?: string
    }
  }
}

export function extractImageUrlsFromKookMessageEvent(eventData: KookMessageEventData): string[] {
  const type = eventData?.type
  const content = eventData?.content

  if (type === 2) {
    if (typeof content === 'string' && content) return [content]
    return []
  }

  if (type !== 10) return []
  if (typeof content !== 'string' || !content) return []

  let cards: any
  try {
    cards = JSON.parse(content)
  } catch {
    return []
  }

  const cardList: any[] = Array.isArray(cards) ? cards : [cards]
  const urls: string[] = []

  for (const card of cardList) {
    const modules: any[] = Array.isArray(card?.modules) ? card.modules : []
    for (const module of modules) {
      if (module?.type !== 'container') continue
      const elements: any[] = Array.isArray(module?.elements) ? module.elements : []
      for (const element of elements) {
        const src = element?.src
        if (typeof src === 'string' && src) urls.push(src)
      }
    }
  }

  return urls
}

export function resolveArkModelId(env: Pick<Bindings, 'ARK_MODEL_ID' | 'MODEL_ID'>): string | undefined {
  const arkModelId = typeof env.ARK_MODEL_ID === 'string' ? env.ARK_MODEL_ID.trim() : ''
  if (arkModelId) return arkModelId
  const modelId = typeof env.MODEL_ID === 'string' ? env.MODEL_ID.trim() : ''
  if (modelId) return modelId
  return undefined
}

export function isKillEventValid(data: KillEventParsed): boolean {
  const victimNameOk = typeof data?.victimName === 'string' && data.victimName.trim().length > 0
  const timestampOk = typeof data?.timestamp === 'string' && data.timestamp.trim().length > 0
  return victimNameOk && timestampOk
}

function resolveApiUrl(baseUrl: string, pathname: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${trimmed}${normalizedPath}`
}

type RegearImageRecognitionDeps = {
  fetch: typeof fetch
  parseKillEventFromImage: typeof parseKillEventFromImage
  console: Pick<Console, 'log' | 'warn' | 'error'>
}

function logError(
  logger: Pick<Console, 'error'>,
  msg: string,
  context: Record<string, unknown>,
  e: unknown,
): void {
  const err = e as any
  logger.error(
    JSON.stringify({
      msg,
      ...context,
      error: {
        name: err?.name,
        message: err?.message ?? String(e),
        stack: err?.stack,
      },
    }),
  )
}

export type RegearImageRecognitionPrecheckResult =
  | {
      ok: true
      eventData: KookMessageEventData
      msgId: string
      guildId?: string
      targetId?: string
      msgUserid?: string
      msgUsername?: string
      imageUrls: string[]
      apiKey: string
      modelId: string
      apiBaseUrl: string
      internalApiToken: string
    }
  | {
      ok: false
      reason:
        | 'missing_msg_id'
        | 'no_images'
        | 'missing_ark_config'
        | 'missing_api_config'
      eventData: KookMessageEventData
      msgId?: string
      imageUrls: string[]
      hasApiKey?: boolean
      hasModelId?: boolean
      hasApiBaseUrl?: boolean
      hasInternalToken?: boolean
    }

export function precheckRegearImageRecognitionInput(
  event: unknown,
  env: Pick<
    Bindings,
    'ARK_API_KEY' | 'ARK_MODEL_ID' | 'MODEL_ID' | 'API_BASE_URL' | 'INTERNAL_API_TOKEN' | 'KOOK_BOT_TOKEN'
  >,
): RegearImageRecognitionPrecheckResult {
  const eventData = (event as any)?.d || event
  const msgId = (eventData as KookMessageEventData | undefined)?.msg_id
  const imageUrls = extractImageUrlsFromKookMessageEvent(eventData as KookMessageEventData)

  if (!msgId) return { ok: false, reason: 'missing_msg_id', eventData, imageUrls }
  if (imageUrls.length === 0) return { ok: false, reason: 'no_images', eventData, msgId, imageUrls }

  const apiKey = typeof env.ARK_API_KEY === 'string' ? env.ARK_API_KEY.trim() : ''
  const modelId = resolveArkModelId(env)
  if (!apiKey || !modelId) {
    return {
      ok: false,
      reason: 'missing_ark_config',
      eventData,
      msgId,
      imageUrls,
      hasApiKey: Boolean(apiKey),
      hasModelId: Boolean(modelId),
    }
  }
  const apiBaseUrl = typeof env.API_BASE_URL === 'string' ? env.API_BASE_URL.trim() : ''
  const internalApiToken =
    typeof env.INTERNAL_API_TOKEN === 'string' ? env.INTERNAL_API_TOKEN.trim() : ''
  if (!apiBaseUrl || !internalApiToken) {
    return {
      ok: false,
      reason: 'missing_api_config',
      eventData,
      msgId,
      imageUrls,
      hasApiBaseUrl: Boolean(apiBaseUrl),
      hasInternalToken: Boolean(internalApiToken),
    }
  }

  const guildId = (eventData as KookMessageEventData | undefined)?.extra?.guild_id
  const targetId = (eventData as KookMessageEventData | undefined)?.target_id
  const msgUserid = (eventData as KookMessageEventData | undefined)?.extra?.author?.id
  const msgUsername = (eventData as KookMessageEventData | undefined)?.extra?.author?.nickname

  return {
    ok: true,
    eventData,
    msgId,
    guildId,
    targetId,
    msgUserid,
    msgUsername,
    imageUrls,
    apiKey,
    modelId,
    apiBaseUrl,
    internalApiToken,
  }
}

async function createRegearApply(
  deps: Pick<RegearImageRecognitionDeps, 'fetch' | 'console'>,
  params: {
  apiBaseUrl: string
  internalApiToken: string
  msgId: string
  msgUserid?: string
  msgUsername?: string
  msgGuild?: string
  msgChannel?: string
  imageUrl: string
  applyDetail: KillEventParsed
  idx: number
  total: number
  },
): Promise<{ id: string } | null> {
  let res: Response
  try {
    res = await deps.fetch(resolveApiUrl(params.apiBaseUrl, '/regear_applies'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.internalApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgId: params.msgId,
        msgUserid: params.msgUserid,
        msgUsername: params.msgUsername,
        msgGuild: params.msgGuild,
        msgChannel: params.msgChannel,
        victimName: params.applyDetail.victimName,
        victimGuild: params.applyDetail.victimGuild,
        applyDetail: params.applyDetail,
        applyMeta: {
          imageUrl: params.imageUrl,
          idx: params.idx,
          total: params.total
        },
      }),
    })
  } catch (e) {
    logError(
      deps.console,
      'regear_apply_fetch_failed',
      { msgId: params.msgId, imageUrl: params.imageUrl, apiBaseUrl: params.apiBaseUrl },
      e,
    )
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    deps.console.error(
      `[regear-image-recognition] create apply failed msgId=${params.msgId} status=${res.status} body=${text}`,
    )
    return null
  }

  const data: any = await res.json().catch(() => null)
  const id = typeof data?.id === 'string' ? data.id : ''
  if (!id) return null
  return { id }
}

export function createRegearImageRecognitionConsumer(
  deps?: Partial<RegearImageRecognitionDeps>,
): Consumer {
  const resolvedDeps: RegearImageRecognitionDeps = {
    fetch: deps?.fetch ?? ((...args) => globalThis.fetch(...(args as Parameters<typeof fetch>))),
    parseKillEventFromImage: deps?.parseKillEventFromImage ?? parseKillEventFromImage,
    console: deps?.console ?? console,
  }

  return {
    consumer_id: 'regear-image-recognition',
    async handle(event, env: Bindings, retry: boolean) {
      try {
        const precheck = precheckRegearImageRecognitionInput(event, env)

        const guildId = precheck.eventData?.extra?.guild_id
        const targetId = precheck.eventData?.target_id

        for (const imageUrl of precheck.imageUrls) {
          resolvedDeps.console.log(
            `[regear-image-recognition] msg_id=${precheck.msgId} guild_id=${guildId} target_id=${targetId} imageUrl=${imageUrl}`,
          )
        }

        if (!precheck.ok) {
          if (precheck.reason === 'missing_ark_config') {
            resolvedDeps.console.error(
              `[regear-image-recognition] missing ark config msg_id=${precheck.msgId} hasApiKey=${Boolean(precheck.hasApiKey)} hasModelId=${Boolean(precheck.hasModelId)}`,
            )
          }
          if (precheck.reason === 'missing_api_config') {
            resolvedDeps.console.error(
              `[regear-image-recognition] missing api config msg_id=${precheck.msgId} hasApiBaseUrl=${Boolean(precheck.hasApiBaseUrl)} hasInternalToken=${Boolean(precheck.hasInternalToken)}`,
            )
          }
          return
        }

        const processedKey = `regear-image-recognition:processed:${precheck.msgId}`
        try {
          const existed = await env.FILTER_CONFIGS.get(processedKey)
          if (existed && !retry) {
            resolvedDeps.console.log(
              `[regear-image-recognition] skip processed msg_id=${precheck.msgId} guild_id=${guildId} target_id=${targetId}`,
            )
            return
          }
        } catch (e) {
          logError(
            resolvedDeps.console,
            'regear_image_recognition_check_processed_failed',
            { msgId: precheck.msgId, guildId, targetId, processedKey },
            e,
          )
        }
        const kook = new RestClient({ token: env.KOOK_BOT_TOKEN.trim() })
        await kook.addReaction({
          msg_id: precheck.msgId,
          emoji: '▶️',
        })
        Promise.all(Array.from({length: precheck.imageUrls.length}, (_, i ) => i+1).map(async (i) => {
          return kook.addReaction({
            msg_id: precheck.msgId,
            emoji: num2emoji(i),
          })
        }))

        for (const [i, imageUrl] of precheck.imageUrls.entries()) {
          
          let parsed: KillEventParsed
          try {
            parsed = await resolvedDeps.parseKillEventFromImage(imageUrl, precheck.apiKey, precheck.modelId)
          } catch (e) {
            logError(
              resolvedDeps.console,
              'regear_image_recognition_failed',
              { msgId: precheck.msgId, guildId, targetId, imageUrl },
              e,
            )
            continue
          }

          if (!isKillEventValid(parsed)) {
            resolvedDeps.console.warn(
              `[regear-image-recognition] invalid recognition msg_id=${precheck.msgId} imageUrl=${imageUrl} victimName=${parsed?.victimName} victimGuild=${parsed?.victimGuild} timestamp=${parsed?.timestamp}`,
            )
            continue
          }
          console.log(`[regear-image-recognition] success ${parsed}`)

          const created = await createRegearApply(resolvedDeps, {
            apiBaseUrl: precheck.apiBaseUrl,
            internalApiToken: precheck.internalApiToken,
            msgId: precheck.msgId,
            msgUserid: precheck.msgUserid,
            msgUsername: precheck.msgUsername,
            msgGuild: precheck.guildId,
            msgChannel: precheck.targetId,
            imageUrl,
            applyDetail: parsed,
            idx: i,
            total: precheck.imageUrls.length,
          })

          if (created) {
            resolvedDeps.console.log(
              `[regear-image-recognition] apply created msg_id=${precheck.msgId} imageUrl=${imageUrl} applyId=${created.id}`,
            )
            try {
              await env.FILTER_CONFIGS.put(processedKey, created.id, { expirationTtl: 60 * 60 * 24 * 7 })
            } catch (e) {
              logError(
                resolvedDeps.console,
                'regear_image_recognition_mark_processed_failed',
                { msgId: precheck.msgId, guildId, targetId, processedKey, applyId: created.id },
                e,
              )
            }
          }
        }
      } catch (e) {
        logError(resolvedDeps.console, 'regear_image_recognition_unhandled', {}, e)
      }
    },
  }
}

export const regearImageRecognitionConsumer = createRegearImageRecognitionConsumer()

function num2emoji(num: number) {
  if (num === 1) {
    return '1️⃣'
  }
  if (num === 2) {
    return '2️⃣'
  }
  if (num === 3) {
    return '3️⃣'
  }
  if (num === 4) {
    return '4️⃣'
  }
  if (num === 5) {
    return '5️⃣'
  }
  if (num === 6) {
    return '6️⃣'
  }
  if (num === 7) {
    return '7️⃣'
  }
  if (num === 8) {
    return '8️⃣'
  }
  if (num === 9) {
    return '9️⃣'
  }
  if (num === 10) {
    return '🔟'
  }
  return '❓'
}
