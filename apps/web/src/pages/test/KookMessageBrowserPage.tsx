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

type KookEmoji = {
  id: string
  name: string
  user_info?: {
    id: string
    username: string
    nickname?: string
  }
}

type KookEmojiList = {
  items: KookEmoji[]
  meta?: {
    page?: number
    page_total?: number
    page_size?: number
    total?: number
  }
}

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
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787'
const CONSUMER_API_BASE = import.meta.env.VITE_CONSUMER_API_BASE ?? 'https://kook-consumer-worker.kootain.workers.dev'

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
  const [deletingReactionByMsgId, setDeletingReactionByMsgId] = useState<Record<string, boolean>>({})

  const [forwardingMessage, setForwardingMessage] = useState<KookMessage | null>(null)
  const [forwardGuildId, setForwardGuildId] = useState<string>('')
  const [forwardChannels, setForwardChannels] = useState<KookChannel[]>([])
  const [forwardChannelId, setForwardChannelId] = useState<string>('')
  const [loadingForwardChannels, setLoadingForwardChannels] = useState(false)
  const [forwarding, setForwarding] = useState(false)
  const [forwardError, setForwardError] = useState<string | null>(null)
  const [forwardOk, setForwardOk] = useState<string | null>(null)

  const [emojiGuildId, setEmojiGuildId] = useState<string>('')
  const [emojiName, setEmojiName] = useState<string>('')
  const [emojiFile, setEmojiFile] = useState<File | null>(null)
  const [uploadingEmoji, setUploadingEmoji] = useState(false)
  const [emojiError, setEmojiError] = useState<string | null>(null)
  const [emojiResult, setEmojiResult] = useState<any>(null)

  const [guildEmojis, setGuildEmojis] = useState<KookEmoji[]>([])
  const [guildEmojisMeta, setGuildEmojisMeta] = useState<KookEmojiList['meta'] | null>(null)
  const [loadingGuildEmojis, setLoadingGuildEmojis] = useState(false)
  const [deletingEmojiById, setDeletingEmojiById] = useState<Record<string, boolean>>({})
  const [emojiListError, setEmojiListError] = useState<string | null>(null)

  const [simulatingEventMsgId, setSimulatingEventMsgId] = useState<Record<string, boolean>>({})
  const [toastMsg, setToastMsg] = useState<{ id: string, text: string } | null>(null)

  // 批量模拟相关状态
  const [batchOffset, setBatchOffset] = useState<number>(0)
  const [batchLimit, setBatchLimit] = useState<number>(10)
  const [batchSimulating, setBatchSimulating] = useState<boolean>(false)
  const [batchShouldStop, setBatchShouldStop] = useState<boolean>(false)
  const [batchProgress, setBatchProgress] = useState<{ current: number, total: number, success: number, fail: number } | null>(null)

  const oldestMessageId = useMemo(() => messages[messages.length - 1]?.id, [messages])

  function showToast(text: string) {
    const id = Math.random().toString(36).substring(2, 9)
    setToastMsg({ id, text })
    setTimeout(() => {
      setToastMsg((prev) => (prev?.id === id ? null : prev))
    }, 3000)
  }

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

  async function loadForwardChannels(guildId: string) {
    setForwardError(null)
    setForwardOk(null)
    setLoadingForwardChannels(true)
    setForwardChannels([])
    setForwardChannelId('')
    try {
      const res = await ((api as any).kook.guilds as any)[':guildId'].channels.$get({ param: { guildId } })
      const json = await res.json() as KookResp<KookList<KookChannel>>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load channels')
      setForwardChannels(json.data.items ?? [])
    } catch (e: any) {
      setForwardError(e?.message ?? String(e))
    } finally {
      setLoadingForwardChannels(false)
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

  async function deleteReaction(msgId: string, emojiInput: string) {
    const emoji = emojiInput
    if (!emoji) return
    const key = `${msgId}:${emoji}`
    setDeletingReactionByMsgId(prev => ({ ...prev, [key]: true }))
    setError(null)
    try {
      const res = await ((api as any).kook.messages as any)[':msgId'].reactions.$delete({
        param: { msgId },
        json: { emoji },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any
        throw new Error(data?.error ?? 'Failed to delete reaction')
      }
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m
        const existing = m.reactions ?? []
        const idx = existing.findIndex(r => r.emoji?.id === emoji || r.emoji?.name === emoji)
        if (idx >= 0) {
          const next = [...existing]
          const currentCount = next[idx].count ?? 1
          if (currentCount <= 1) {
            next.splice(idx, 1)
          } else {
            next[idx] = { ...next[idx], count: currentCount - 1, me: false }
          }
          return { ...m, reactions: next }
        }
        return m
      }))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setDeletingReactionByMsgId(prev => ({ ...prev, [key]: false }))
    }
  }

  async function uploadGuildEmoji() {
    if (!emojiGuildId || !emojiFile) return
    setEmojiError(null)
    setEmojiResult(null)
    setUploadingEmoji(true)
    try {
      if (emojiFile.size > 256 * 1024) {
        throw new Error('图片大小不能超过 256KB')
      }
      if (emojiFile.type && emojiFile.type !== 'image/png') {
        throw new Error('仅支持 PNG 图片')
      }

      const token = localStorage.getItem('albion_erp_token')
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`

      const fd = new FormData()
      fd.set('guildId', emojiGuildId)
      if (emojiName.trim()) fd.set('name', emojiName.trim())
      fd.set('emoji', emojiFile, emojiFile.name)

      const res = await fetch(`${API_BASE}/kook/guilds/emojis`, {
        method: 'POST',
        headers,
        body: fd,
      })

      const json = await res.json().catch(() => null) as any
      if (!res.ok) {
        throw new Error(json?.error ?? '上传失败')
      }
      if (json?.code !== 0) {
        throw new Error(json?.message ?? '上传失败')
      }
      setEmojiResult(json?.data ?? json)
      setEmojiName('')
      setEmojiFile(null)
      await loadGuildEmojis(emojiGuildId)
    } catch (e: any) {
      setEmojiError(e?.message ?? String(e))
    } finally {
      setUploadingEmoji(false)
    }
  }

  async function loadGuildEmojis(guildId: string) {
    setEmojiListError(null)
    setLoadingGuildEmojis(true)
    try {
      const res = await (api as any).kook.guilds.emojis.$get({ query: { guildId, page: '1', pageSize: '100' } })
      const json = await res.json() as KookResp<KookEmojiList>
      if (json.code !== 0) throw new Error(json.message || 'Failed to load guild emojis')
      setGuildEmojis(json.data.items ?? [])
      setGuildEmojisMeta(json.data.meta ?? null)
    } catch (e: any) {
      setEmojiListError(e?.message ?? String(e))
    } finally {
      setLoadingGuildEmojis(false)
    }
  }

  async function deleteGuildEmoji(guildId: string, emojiId: string) {
    if (!guildId || !emojiId) return
    setEmojiListError(null)
    setDeletingEmojiById(prev => ({ ...prev, [emojiId]: true }))
    try {
      const res = await (api as any).kook.guilds.emojis.$delete({ json: { emojiId } })
      const json = await res.json().catch(() => null) as any
      if (!res.ok) throw new Error(json?.error ?? '删除失败')
      if (json?.code !== 0) throw new Error(json?.message ?? '删除失败')
      setGuildEmojis(prev => prev.filter(e => e.id !== emojiId))
    } catch (e: any) {
      setEmojiListError(e?.message ?? String(e))
    } finally {
      setDeletingEmojiById(prev => ({ ...prev, [emojiId]: false }))
    }
  }

  async function forwardMessage() {
    if (!forwardingMessage || !forwardChannelId) return
    setForwardError(null)
    setForwardOk(null)
    setForwarding(true)
    try {
      const res = await (api as any).kook.messages.send.$post({
        json: {
          channelId: forwardChannelId,
          content: forwardingMessage.content,
          type: forwardingMessage.type,
        },
      })
      const json = await res.json().catch(() => null) as any
      if (!res.ok) throw new Error(json?.error ?? '转发失败')
      if (json?.code !== 0) throw new Error(json?.message ?? '转发失败')
      setForwardOk('转发成功')
      setForwardingMessage(null)
    } catch (e: any) {
      setForwardError(e?.message ?? String(e))
    } finally {
      setForwarding(false)
    }
  }

  async function simulateEventConsumer(m: KookMessage) {
    if (!selectedGuildId || !selectedChannelId) {
      setError('请先选择服务器和频道')
      return
    }
    
    setSimulatingEventMsgId(prev => ({ ...prev, [m.id]: true }))
    setError(null)
    
    try {
      const res = await fetch(`${CONSUMER_API_BASE}/api/consumer/message_to_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: m,
          context: {
            channel_type: 'GROUP',
            target_id: selectedChannelId,
            guild_id: selectedGuildId,
            // 假设需要的话，也可以通过 find 获取真正的 channel name
            channel_name: channels.find(c => c.id === selectedChannelId)?.name || ''
          }
        })
      })
      
      const json = await res.json().catch(() => null) as any
      if (!res.ok) {
        throw new Error(json?.error ?? '模拟失败')
      }
      if (!json?.success) {
        throw new Error('模拟失败')
      }
      
      // 可以展示一个短暂的成功提示，或者直接在 console 打印
      console.log('模拟事件消费成功', json.event)
      return true
    } catch (e: any) {
      setError(e?.message ?? String(e))
      return false
    } finally {
      setSimulatingEventMsgId(prev => ({ ...prev, [m.id]: false }))
    }
  }

  async function handleSingleSimulate(m: KookMessage) {
    const success = await simulateEventConsumer(m)
    if (success) {
      showToast(`✅ 消息 ${m.id.substring(0, 6)}... 模拟成功！`)
    }
  }

  async function handleBatchSimulate() {
    if (batchSimulating || messages.length === 0) return
    const offset = Math.max(0, batchOffset)
    const limit = Math.max(1, batchLimit)
    const targetMessages = messages.slice(offset, offset + limit)
    
    if (targetMessages.length === 0) {
      showToast('⚠️ 当前 offset 超过了已加载消息长度')
      return
    }

    setBatchSimulating(true)
    setBatchShouldStop(false)
    setBatchProgress({ current: 0, total: targetMessages.length, success: 0, fail: 0 })

    let successCount = 0
    let failCount = 0
    let stopped = false

    // 使用局部引用防止闭包读取不到最新 state
    let shouldStopRef = false;
    setBatchShouldStop((prev) => {
      shouldStopRef = false;
      return false;
    })

    for (let i = 0; i < targetMessages.length; i++) {
      // 在每次循环前重新从 set state 获取最新状态以确保中断
      setBatchShouldStop(prev => {
        shouldStopRef = prev
        return prev
      })
      if (shouldStopRef) {
        stopped = true
        break
      }

      setBatchProgress(p => p ? { ...p, current: i + 1 } : null)
      const m = targetMessages[i]
      const ok = await simulateEventConsumer(m)
      if (ok) successCount++
      else failCount++
      
      setBatchProgress(p => p ? { ...p, success: successCount, fail: failCount } : null)
      
      // 简单延迟，避免并发过高
      await new Promise(r => setTimeout(r, 300))
    }

    setBatchSimulating(false)
    setBatchShouldStop(false)
    if (stopped) {
      showToast(`🛑 批量执行已中止: 成功 ${successCount}，失败 ${failCount}`)
    } else {
      showToast(`✅ 批量执行完毕: 成功 ${successCount}，失败 ${failCount}`)
    }
  }

  useEffect(() => {
    loadGuilds()
  }, [])

  useEffect(() => {
    if (selectedGuildId && !emojiGuildId) setEmojiGuildId(selectedGuildId)
  }, [selectedGuildId, emojiGuildId])

  useEffect(() => {
    if (emojiGuildId) loadGuildEmojis(emojiGuildId)
  }, [emojiGuildId])

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

      {/* 批量模拟面板 */}
      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-rose-200 uppercase tracking-widest">批量模拟消费</div>
          <div className="text-xs text-slate-400">根据当前加载的消息列表，按 Offset 和 Limit 范围自动依次触发消费。</div>
        </div>
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="w-full md:w-32">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Offset</div>
            <input
              type="number"
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
              value={batchOffset}
              onChange={(e) => setBatchOffset(Number(e.target.value))}
              min={0}
              disabled={batchSimulating}
            />
          </div>
          <div className="w-full md:w-32">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Limit</div>
            <input
              type="number"
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500/50"
              value={batchLimit}
              onChange={(e) => setBatchLimit(Number(e.target.value))}
              min={1}
              disabled={batchSimulating}
            />
          </div>
          <button
            className="w-full md:w-auto px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-black rounded-xl border border-rose-500/30 disabled:opacity-50 uppercase tracking-widest text-xs"
            onClick={handleBatchSimulate}
            disabled={batchSimulating || messages.length === 0}
          >
            {batchSimulating ? '执行中...' : '开始批量执行'}
          </button>
          
          {batchSimulating && (
            <button
              className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-600 uppercase tracking-widest text-xs"
              onClick={() => setBatchShouldStop(true)}
              disabled={batchShouldStop}
            >
              {batchShouldStop ? '正在中止...' : '中止'}
            </button>
          )}
        </div>
        
        {batchProgress && (
          <div className="text-xs text-slate-300">
            进度: <span className="font-bold text-white">{batchProgress.current}</span> / {batchProgress.total} 
            <span className="mx-2 text-slate-600">|</span> 
            成功: <span className="font-bold text-emerald-400">{batchProgress.success}</span> 
            <span className="mx-2 text-slate-600">|</span> 
            失败: <span className="font-bold text-rose-400">{batchProgress.fail}</span>
          </div>
        )}
      </div>

      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-white uppercase tracking-widest">上传服务器表情</div>
          <div className="text-xs text-slate-400">选择服务器并上传 PNG 图片（最大 256KB）。</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">服务器</div>
            <select
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              value={emojiGuildId}
              onChange={(e) => setEmojiGuildId(e.target.value)}
              disabled={loadingGuilds}
            >
              <option value="">请选择服务器</option>
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">表情名（可选）</div>
            <input
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              value={emojiName}
              onChange={(e) => setEmojiName(e.target.value)}
              placeholder="2 - 32 字符"
            />
          </div>

          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">PNG 图片</div>
            <input
              type="file"
              accept="image/png"
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-black-border file:px-3 file:py-1 file:text-xs file:font-black file:text-white"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setEmojiFile(f)
              }}
            />
            {emojiFile ? (
              <div className="mt-2 text-xs text-slate-400">
                {emojiFile.name} · {Math.ceil(emojiFile.size / 1024)} KB
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 bg-gold hover:bg-gold-hover text-black font-black rounded-xl disabled:opacity-50 uppercase tracking-widest text-[10px]"
            onClick={uploadGuildEmoji}
            disabled={!emojiGuildId || !emojiFile || uploadingEmoji}
          >
            {uploadingEmoji ? '上传中...' : '上传'}
          </button>
          {emojiError ? <div className="text-rose-400 text-sm">{emojiError}</div> : null}
          {emojiResult ? (
            <div className="text-emerald-300 text-sm">
              上传成功：{emojiResult?.name ?? ''}{emojiResult?.id ? ` (${emojiResult.id})` : ''}
            </div>
          ) : null}
        </div>

        <div className="border-t border-black-border pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              表情数量：{guildEmojisMeta?.total ?? guildEmojis.length}
              {guildEmojisMeta?.page_total && guildEmojisMeta.page_total > 1 ? `（仅展示第 1 页，共 ${guildEmojisMeta.page_total} 页）` : ''}
            </div>
            <button
              className="px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
              onClick={() => emojiGuildId && loadGuildEmojis(emojiGuildId)}
              disabled={!emojiGuildId || loadingGuildEmojis}
            >
              {loadingGuildEmojis ? '加载中...' : '刷新表情列表'}
            </button>
          </div>

          {emojiListError ? <div className="text-rose-400 text-sm">{emojiListError}</div> : null}

          <div className="space-y-2">
            {guildEmojis.map((e) => (
              <div key={e.id} className="flex flex-col md:flex-row md:items-center gap-2 bg-black-bg border border-black-border rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-bold truncate">{e.name}</div>
                  <div className="text-xs text-slate-400 truncate">{e.id}</div>
                </div>
                <button
                  className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-black rounded-xl border border-rose-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                  onClick={() => deleteGuildEmoji(emojiGuildId, e.id)}
                  disabled={!!deletingEmojiById[e.id]}
                >
                  {deletingEmojiById[e.id] ? '删除中...' : '删除'}
                </button>
              </div>
            ))}
            {!loadingGuildEmojis && emojiGuildId && guildEmojis.length === 0 ? (
              <div className="text-sm text-slate-400">当前服务器暂无表情。</div>
            ) : null}
          </div>
        </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div>id: {m.id}</div>
                    <div>type: {m.type}</div>
                    {authorName ? <div>author: {authorName}</div> : null}
                    {time ? <div>time: {time}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-black rounded-lg border border-rose-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                      onClick={() => handleSingleSimulate(m)}
                      disabled={!!simulatingEventMsgId[m.id]}
                    >
                      {simulatingEventMsgId[m.id] ? '模拟中...' : '模拟消费'}
                    </button>
                    <button
                      className="px-3 py-1 bg-black-bg hover:bg-black-border text-white font-black rounded-lg border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
                      onClick={() => {
                      setForwardingMessage(m)
                      const gid = selectedGuildId
                      setForwardGuildId(gid)
                      setForwardChannelId('')
                      setForwardOk(null)
                      setForwardError(null)
                      if (gid) loadForwardChannels(gid)
                    }}
                    disabled={!guilds.length}
                  >
                    转发
                  </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(m.reactions ?? []).map((r) => {
                    const emojiIdOrName = r.emoji?.id ?? r.emoji?.name ?? ''
                    const key = `${m.id}:${emojiIdOrName}`
                    const label = fromKookEmojiId(emojiIdOrName)
                    const isDeleting = !!deletingReactionByMsgId[key]
                    
                    return (
                      <div key={key} className="px-2 py-1 rounded-lg bg-black-bg border border-black-border text-xs text-slate-200 flex items-center gap-1 group relative">
                        <span>{label}</span>
                        <span className="text-slate-400">{r.count}</span>
                        {r.me ? <span className="text-gold">•</span> : null}
                        {r.me ? (
                          <button
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500/80 text-white text-[10px] hidden group-hover:flex items-center justify-center cursor-pointer shadow-md disabled:opacity-50"
                            onClick={() => deleteReaction(m.id, emojiIdOrName)}
                            disabled={isDeleting}
                            title="取消回应"
                          >
                            ×
                          </button>
                        ) : null}
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

      {forwardingMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-xl bg-black-card border border-black-border rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-white uppercase tracking-widest">转发消息</div>
              <button
                className="px-3 py-1 bg-black-bg hover:bg-black-border text-white font-black rounded-lg border border-black-border uppercase tracking-widest text-[10px]"
                onClick={() => setForwardingMessage(null)}
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:items-end">
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">目标服务器</div>
                <select
                  className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                  value={forwardGuildId}
                  onChange={(e) => {
                    const v = e.target.value
                    setForwardGuildId(v)
                    if (v) loadForwardChannels(v)
                  }}
                >
                  <option value="">请选择服务器</option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">目标频道</div>
                <select
                  className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 disabled:opacity-50"
                  value={forwardChannelId}
                  onChange={(e) => setForwardChannelId(e.target.value)}
                  disabled={!forwardGuildId || loadingForwardChannels}
                >
                  <option value="">{loadingForwardChannels ? '加载中...' : '请选择频道'}</option>
                  {forwardChannels.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {forwardError ? <div className="text-rose-400 text-sm">{forwardError}</div> : null}
            {forwardOk ? <div className="text-emerald-300 text-sm">{forwardOk}</div> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
                onClick={() => setForwardingMessage(null)}
                disabled={forwarding}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-gold hover:bg-gold-hover text-black font-black rounded-xl disabled:opacity-50 uppercase tracking-widest text-[10px]"
                onClick={forwardMessage}
                disabled={!forwardChannelId || forwarding}
              >
                {forwarding ? '转发中...' : '确认转发'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 浮动 Toast 通知 */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[9999] bg-black-card border border-emerald-500/30 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="text-emerald-400 text-sm font-bold">{toastMsg.text}</div>
          <button 
            className="text-slate-400 hover:text-white"
            onClick={() => setToastMsg(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
