import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { MessagePreview } from '@kookapp/kook-message-preview'
import '@kookapp/kook-message-preview/dist/esm/styles/index.less'

type KookResp<T> = { code: number; message: string; data: T }

type KookList<T> = {
  items: T[]
  meta?: {
    page?: number
    page_size?: number
    total?: number
  }
}

type KookGuild = { id: string; name: string }
type KookChannel = { id: string; name: string }

type KookMessage = {
  id: string
  type: number
  content: string
  create_at?: number
  author?: { id: string; username: string; nickname?: string }
}

const KOOK_KMD_WASM_EXTERNAL = 'https://cdn.jsdelivr.net/npm/@kookapp/kook-message-preview@0.0.3/dist/markdown-parse.0.0.10.js'

function sortMessagesNewestFirst(items: KookMessage[]) {
  return [...items].sort((a, b) => (b.create_at ?? 0) - (a.create_at ?? 0))
}

function formatTs(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function KookMessageBrowserPage() {
  const [guilds, setGuilds] = useState<KookGuild[]>([])
  const [channels, setChannels] = useState<KookChannel[]>([])

  const [selectedGuildId, setSelectedGuildId] = useState<string>('')
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')

  const [messages, setMessages] = useState<KookMessage[]>([])
  const [loadingGuilds, setLoadingGuilds] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'preview' | 'json'>('preview')

  const oldestMessageId = useMemo(() => messages[messages.length - 1]?.id, [messages])

  async function loadGuilds() {
    setError(null)
    setLoadingGuilds(true)
    try {
      const res = await (api as any).kook.guilds.$get()
      const json = await res.json() as KookResp<KookList<KookGuild>>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load guilds')
      setGuilds(json.data.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoadingGuilds(false)
    }
  }

  async function loadChannels(guildId: string) {
    setError(null)
    setLoadingChannels(true)
    setChannels([])
    setSelectedChannelId('')
    setMessages([])
    try {
      const res = await ((api as any).kook.guilds as any)[':guildId'].channels.$get({ param: { guildId } })
      const json = await res.json() as KookResp<KookList<KookChannel>>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load channels')
      setChannels(json.data.items ?? [])
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoadingChannels(false)
    }
  }

  async function loadLatestMessages(channelId: string) {
    setError(null)
    setLoadingMessages(true)
    setMessages([])
    try {
      const res = await ((api as any).kook.channels as any)[':channelId'].messages.$get({ param: { channelId }, query: { pageSize: '50' } })
      const json = await res.json() as KookResp<KookList<KookMessage>>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load messages')
      setMessages(sortMessagesNewestFirst(json.data.items ?? []))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoadingMessages(false)
    }
  }

  async function loadMoreMessages() {
    if (!selectedChannelId || !oldestMessageId) return
    setError(null)
    setLoadingMore(true)
    try {
      const res = await ((api as any).kook.channels as any)[':channelId'].messages.$get({
        param: { channelId: selectedChannelId },
        query: { before: oldestMessageId, pageSize: '50' },
      })
      const json = await res.json() as KookResp<KookList<KookMessage>>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load more messages')
      const next = json.data.items ?? []
      setMessages((prev) => sortMessagesNewestFirst([...prev, ...next]))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadGuilds()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">KOOK 消息浏览</h1>
        <div className="text-sm text-slate-400">选择服务器和频道后加载消息，支持预览和 JSON 两种展示。</div>
      </div>

      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">服务器</div>
            <select
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              value={selectedGuildId}
              onChange={(e) => {
                const v = e.target.value
                setSelectedGuildId(v)
                if (v) loadChannels(v)
              }}
              disabled={loadingGuilds}
            >
              <option value="">请选择服务器</option>
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">频道</div>
            <select
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 disabled:opacity-50"
              value={selectedChannelId}
              onChange={(e) => {
                const v = e.target.value
                setSelectedChannelId(v)
                if (v) loadLatestMessages(v)
              }}
              disabled={!selectedGuildId || loadingChannels}
            >
              <option value="">请选择频道</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gold hover:bg-gold-hover text-black font-black rounded-xl disabled:opacity-50 uppercase tracking-widest text-[10px]"
              onClick={() => selectedChannelId && loadLatestMessages(selectedChannelId)}
              disabled={!selectedChannelId || loadingMessages}
            >
              刷新
            </button>
            <button
              className="px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
              onClick={loadGuilds}
              disabled={loadingGuilds}
            >
              重新加载服务器
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">展示模式</div>
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input type="radio" checked={viewMode === 'preview'} onChange={() => setViewMode('preview')} />
            预览
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input type="radio" checked={viewMode === 'json'} onChange={() => setViewMode('json')} />
            JSON
          </label>
        </div>

        {error ? <div className="text-rose-400 text-sm">{error}</div> : null}
        {loadingGuilds ? <div className="text-sm text-slate-400">加载服务器中...</div> : null}
        {loadingChannels ? <div className="text-sm text-slate-400">加载频道中...</div> : null}
        {loadingMessages ? <div className="text-sm text-slate-400">加载消息中...</div> : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">已加载消息：{messages.length}</div>
          <button
            className="px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
            onClick={loadMoreMessages}
            disabled={!selectedChannelId || !oldestMessageId || loadingMore}
          >
            加载更多（更旧）
          </button>
        </div>

        <div className="space-y-3">
          {messages.map((m) => {
            const authorName = m.author?.nickname || m.author?.username || ''
            const time = formatTs(m.create_at)
            let parsedCard: any[] | null = null
            if (m.type === 10) {
              try {
                const v = JSON.parse(m.content)
                if (Array.isArray(v)) parsedCard = v
              } catch {
                parsedCard = null
              }
            }
            return (
              <div key={m.id} className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <div>id: {m.id}</div>
                  <div>type: {m.type}</div>
                  {authorName ? <div>author: {authorName}</div> : null}
                  {time ? <div>time: {time}</div> : null}
                </div>

                {viewMode === 'json' ? (
                  <pre className="text-xs bg-black-bg border border-black-border text-emerald-200 p-3 rounded-xl overflow-x-auto">{JSON.stringify(m, null, 2)}</pre>
                ) : (
                  <div className="space-y-2">
                    {m.type === 2 ? (
                      <img src={m.content} className="max-w-full rounded-xl border border-black-border" />
                    ) : null}
                    {m.type === 9 ? (
                      <div className="rounded-xl border border-black-border bg-black-bg overflow-hidden">
                        <MessagePreview type="kmd" theme="dark" content={m.content} external={KOOK_KMD_WASM_EXTERNAL} />
                      </div>
                    ) : null}
                    {m.type === 10 ? (
                      parsedCard ? (
                        <div className="rounded-xl border border-black-border bg-black-bg overflow-hidden">
                          <MessagePreview type="card" theme="dark" content={parsedCard} external={KOOK_KMD_WASM_EXTERNAL} collapsed />
                        </div>
                      ) : (
                        <pre className="text-xs bg-black-bg border border-black-border text-slate-200 p-3 rounded-xl overflow-x-auto">{m.content}</pre>
                      )
                    ) : null}
                    {m.type !== 2 && m.type !== 9 && m.type !== 10 ? (
                      <pre className="text-xs bg-black-bg border border-black-border text-slate-200 p-3 rounded-xl overflow-x-auto">{m.content}</pre>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
