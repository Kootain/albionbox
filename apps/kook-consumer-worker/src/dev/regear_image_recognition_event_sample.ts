import type { KillEventParsed } from '@albionbox/shared/utils/api_image'
import type { Bindings } from '../bindings.js'
import {
  createRegearImageRecognitionConsumer,
  type KookMessageEventData,
} from '../consumers/regear_image_recognition.js'

function createMockKv(): KVNamespace {
  const store = new Map<string, string>()
  return {
    get: async (key: string) => store.get(key) ?? null,
    getWithMetadata: async (key: string) => ({ value: store.get(key) ?? null, metadata: null }),
    put: async (key: string, value: string) => {
      store.set(key, value)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    list: async () => ({ keys: [], list_complete: true, cursor: '' }),
  } as unknown as KVNamespace
}

function createMockEnv(overrides?: Partial<Bindings>): Bindings {
  return {
    FILTER_CONFIGS: createMockKv(),
    KOOK_BOT_TOKEN: 'mock-kook-token',
    ARK_API_KEY: 'mock-ark-api-key',
    MODEL_ID: 'mock-model-id',
    API_BASE_URL: 'https://example.local',
    INTERNAL_API_TOKEN: 'mock-internal-token',
    ...overrides,
  }
}

const mockParsed: KillEventParsed = {
  killerName: 'Killer',
  killerGuild: 'KillerGuild',
  killerIP: 1500,
  victimName: 'Victim',
  victimGuild: 'VictimGuild',
  victimIP: 1400,
  killFame: 123456,
  timestamp: '2026-04-15 12:45',
  mapName: 'Bridgewatch',
  assists: 0,
}

async function runOnce(label: string, eventData: KookMessageEventData, env: Bindings) {
  const consumer = createRegearImageRecognitionConsumer({
    parseKillEventFromImage: async () => mockParsed,
    fetch: async () =>
      new Response(JSON.stringify({ id: 'mock-regear-apply-id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })

  console.log(`\n=== ${label} ===`)
  await consumer.handle({ d: eventData }, env)
}

async function main() {
  const baseEvent: KookMessageEventData = {
    msg_id: 'mock-msg-id',
    target_id: 'mock-channel-id',
    extra: {
      guild_id: 'mock-guild-id',
      author: { id: 'mock-user-id', username: 'mock-username' },
    },
  }

  const sharedEnv = createMockEnv()

  await runOnce(
    'type=2 image message',
    {
      ...baseEvent,
      type: 2,
      content: 'https://img.kookapp.cn/attachments/mock.png',
    },
    sharedEnv,
  )

  await runOnce(
    'type=2 image message (duplicate msg_id, should skip)',
    {
      ...baseEvent,
      type: 2,
      content: 'https://img.kookapp.cn/attachments/mock.png',
    },
    sharedEnv,
  )

  await runOnce(
    'type=10 card message (container.elements.src)',
    {
      ...baseEvent,
      type: 10,
      content: JSON.stringify([
        {
          modules: [
            {
              type: 'container',
              elements: [
                { type: 'image', src: 'https://img.kookapp.cn/attachments/mock2.png' },
                { type: 'image', src: 'https://img.kookapp.cn/attachments/mock3.png' },
              ],
            },
          ],
        },
      ]),
    },
    createMockEnv(),
  )

  await runOnce(
    'missing ark config (should stop at precheck)',
    {
      ...baseEvent,
      type: 2,
      content: 'https://img.kookapp.cn/attachments/mock.png',
    },
    createMockEnv({ ARK_API_KEY: '' }),
  )
}

main().catch((e) => {
  console.error(e)
})
