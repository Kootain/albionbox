import type { Consumer } from '../consumer.js'
import type { Bindings } from '../bindings.js'

type ReactionChangedDeps = {
  fetch: typeof fetch
  console: Pick<Console, 'log' | 'warn' | 'error'>
}

export function createReactionChangedConsumer(
  deps?: Partial<ReactionChangedDeps>,
): Consumer {
  const resolvedDeps: ReactionChangedDeps = {
    fetch: deps?.fetch ?? ((...args) => globalThis.fetch(...(args as Parameters<typeof fetch>))),
    console: deps?.console ?? console,
  }

  return {
    consumer_id: 'reaction-changed',
    async handle(event, env: Bindings, retry: boolean) {
      try {
        const eventData = (event as any)?.d || event
        
        if (eventData?.type !== 255) return
        
        const extraType = eventData?.extra?.type
        if (extraType !== 'added_reaction' && extraType !== 'deleted_reaction') return

        const body = eventData?.extra?.body
        const msgId = body?.msg_id
        const userId = body?.user_id
        const emojiId = body?.emoji?.id
        const emojiName = body?.emoji?.name

        if (!msgId || !userId) return

        if (emojiId !== '✅' && emojiName !== '✅') return

        const adminUserIdsStr = typeof env.ADMIN_USER_IDS === 'string' ? env.ADMIN_USER_IDS : ''
        const adminUserIds = adminUserIdsStr.split(',').map(s => s.trim()).filter(Boolean)
        
        if (!adminUserIds.includes(userId)) {
          resolvedDeps.console.log(`[reaction-changed] user ${userId} is not admin, ignoring`)
          return
        }

        const apiBaseUrl = typeof env.API_BASE_URL === 'string' ? env.API_BASE_URL.trim() : ''
        const internalApiToken = typeof env.INTERNAL_API_TOKEN === 'string' ? env.INTERNAL_API_TOKEN.trim() : ''

        if (!apiBaseUrl || !internalApiToken) {
          resolvedDeps.console.error(
            `[reaction-changed] missing api config msg_id=${msgId} hasApiBaseUrl=${Boolean(apiBaseUrl)} hasInternalToken=${Boolean(internalApiToken)}`,
          )
          return
        }

        const trimmed = apiBaseUrl.replace(/\/+$/, '')
        const url = `${trimmed}/regear_applies/by-msg/${msgId}/reaction`

        const action = extraType === 'added_reaction' ? 'add' : 'remove'

        const res = await resolvedDeps.fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${internalApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          resolvedDeps.console.error(
            `[reaction-changed] ${action} reaction failed msg_id=${msgId} status=${res.status} body=${text}`,
          )
        } else {
          resolvedDeps.console.log(`[reaction-changed] ${action} reaction success msg_id=${msgId}`)
        }
      } catch (e) {
        const err = e as any
        resolvedDeps.console.error(
          JSON.stringify({
            msg: 'reaction_changed_unhandled',
            error: {
              name: err?.name,
              message: err?.message ?? String(e),
              stack: err?.stack,
            },
          }),
        )
      }
    },
  }
}

export const reactionChangedConsumer = createReactionChangedConsumer()
