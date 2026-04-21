import type { Consumer } from '../consumer.js'
import type { Bindings } from '../bindings.js'

type RegearMessageDeletedDeps = {
  fetch: typeof fetch
  console: Pick<Console, 'log' | 'warn' | 'error'>
}

export function createMessageDeletedConsumer(
  deps?: Partial<RegearMessageDeletedDeps>,
): Consumer {
  const resolvedDeps: RegearMessageDeletedDeps = {
    fetch: deps?.fetch ?? ((...args) => globalThis.fetch(...(args as Parameters<typeof fetch>))),
    console: deps?.console ?? console,
  }

  return {
    consumer_id: 'message-deleted',
    async handle(event, env: Bindings, retry: boolean) {
      try {
        const eventData = (event as any)?.d || event
        
        // system event type
        if (eventData?.type !== 255) return
        if (eventData?.extra?.type !== 'deleted_message') return

        const deletedMsgId = eventData?.extra?.body?.msg_id
        if (!deletedMsgId || typeof deletedMsgId !== 'string') return

        const apiBaseUrl = typeof env.API_BASE_URL === 'string' ? env.API_BASE_URL.trim() : ''
        const internalApiToken = typeof env.INTERNAL_API_TOKEN === 'string' ? env.INTERNAL_API_TOKEN.trim() : ''

        if (!apiBaseUrl || !internalApiToken) {
          resolvedDeps.console.error(
            `[message-deleted] missing api config msg_id=${deletedMsgId} hasApiBaseUrl=${Boolean(apiBaseUrl)} hasInternalToken=${Boolean(internalApiToken)}`,
          )
          return
        }

        const trimmed = apiBaseUrl.replace(/\/+$/, '')
        const url = `${trimmed}/regear_applies/by-msg/${deletedMsgId}`

        const res = await resolvedDeps.fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${internalApiToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          resolvedDeps.console.error(
            `[message-deleted] delete apply failed msg_id=${deletedMsgId} status=${res.status} body=${text}`,
          )
        } else {
          resolvedDeps.console.log(`[message-deleted] delete apply success msg_id=${deletedMsgId}`)
        }
      } catch (e) {
        const err = e as any
        resolvedDeps.console.error(
          JSON.stringify({
            msg: 'message_deleted_unhandled',
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

export const messageDeletedConsumer = createMessageDeletedConsumer()
