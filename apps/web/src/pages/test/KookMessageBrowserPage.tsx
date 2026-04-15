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
  reactions?: Array<{
    emoji: { id: string; name: string }
    count: number
    me?: boolean
  }>
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

function toKookEmojiId(input: string) {
  const v = (input ?? '').trim()
  if (!v) return ''
  if (v.startsWith('[') && v.endsWith(']')) return v

  const cps = Array.from(v).map(ch => ch.codePointAt(0)).filter((x): x is number => typeof x === 'number')
  if (cps.length === 0) return v
  if (cps.length === 1) return `[#${cps[0]};]`
  return `[#${cps.join(';#')};]`
}

function fromKookEmojiId(idOrName: string) {
  const v = (idOrName ?? '').trim()
  const m = v.match(/^\[#(.+)\]$/)
  if (!m) return v
  const inner = m[1].replace(/;$/, '')
  const parts = inner.split(';').filter(Boolean).map(p => p.replace(/^#/, ''))
  const chars = parts
    .map(p => Number(p))
    .filter(n => Number.isFinite(n))
    .map(n => String.fromCodePoint(n))
  return chars.length ? chars.join('') : v
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
  const [reactionInputByMsgId, setReactionInputByMsgId] = useState<Record<string, string>>({})
  const [addingReactionByMsgId, setAddingReactionByMsgId] = useState<Record<string, boolean>>({})

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

  async function addReaction(msgId: string, emojiInput: string) {
    const emoji = toKookEmojiId(emojiInput)
    if (!emoji) return
    setAddingReactionByMsgId(prev => ({ ...prev, [msgId]: true }))
    setError(null)
    try {
      const res = await ((api as any).kook.messages as any)[':msgId'].reactions.$post({
        param: { msgId },
        json: { emoji },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any
        throw new Error(data?.error ?? 'Failed to add reaction')
      }
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m
        const existing = m.reactions ?? []
        const idx = existing.findIndex(r => r.emoji?.id === emoji || r.emoji?.name === emoji)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = { ...next[idx], count: (next[idx].count ?? 0) + 1, me: true }
          return { ...m, reactions: next }
        }
        return { ...m, reactions: [...existing, { emoji: { id: emoji, name: emoji }, count: 1, me: true }] }
      }))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setAddingReactionByMsgId(prev => ({ ...prev, [msgId]: false }))
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

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(m.reactions ?? []).map((r) => {
                    const key = `${m.id}:${r.emoji?.id ?? r.emoji?.name}`
                    const label = fromKookEmojiId(r.emoji?.id ?? r.emoji?.name ?? '')
                    return (
                      <div key={key} className="px-2 py-1 rounded-lg bg-black-bg border border-black-border text-xs text-slate-200 flex items-center gap-1">
                        <span>{label}</span>
                        <span className="text-slate-400">{r.count}</span>
                        {r.me ? <span className="text-gold">•</span> : null}
                      </div>
                    )
                  })}

                  <div className="flex items-center gap-2">
                    <input
                      value={reactionInputByMsgId[m.id] ?? ''}
                      onChange={(e) => setReactionInputByMsgId(prev => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="😀 或 [#128512;]"
                      className="w-40 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-gold/50"
                    />
                    <button
                      className="px-3 py-1 bg-black-bg hover:bg-black-border text-white font-black rounded-lg border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
                      onClick={() => addReaction(m.id, reactionInputByMsgId[m.id] ?? '')}
                      disabled={!!addingReactionByMsgId[m.id]}
                    >
                      回应
                    </button>
                  </div>
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
