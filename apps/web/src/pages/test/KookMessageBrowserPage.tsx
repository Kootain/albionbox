import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { MessagePreview } from '@kookapp/kook-message-preview'
import '@kookapp/kook-message-preview/dist/esm/styles/index.less'
import { Modal } from '@/components/ui'
import { AlbionPlayerSearch } from '@/components/AlbionPlayerSearch'

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
type SystemGuild = { id: string; name: string; server: string }

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
  quote: KookMessage | null
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

function formatDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function escapeCsvValue(value: string | number) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
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


function extractAllEmojis(str: string): string[] {
  const emojiRegex = /\p{Emoji}|\p{Emoji_Modifier}|\p{Emoji_Component}|\p{Emoji_Keycap_Sequence}/vg;
  return str.match(emojiRegex) || [];
}

function countEmoji(messages: KookMessage[]): Record<string, Record<string, number>> {
  const enable_emojis: Record<string, boolean> = {
    '🟢': true, 
    '🔵': true, 
    '🟣': true, 
    '🟡': true,
    '❓': true,
    '🔁': true
  }
  const users: Record<string, Record<string, number>> = {}
  for (const i in messages) {
    const m = messages[i]
    if (!m.author?.nickname) {
      continue
    }
    if (!(m.author.nickname in users)) {
      users[m.author.nickname] = {}
    }
    if (m.reactions) {
      for (let j = 0;  j < (m.reactions?.length ?? 0); j ++) {
        const reaction = m.reactions[j].emoji.id
        if (enable_emojis[reaction]) {
          users[m.author.nickname][reaction] = (users[m.author.nickname][reaction] ?? 0) + 1
        }
      }
    }
    if (m.quote) {
      if (!m.quote.author?.nickname) {
      continue
      }
      if (!(m.quote.author.nickname in users)) {
        users[m.quote.author.nickname] = {}
      }
      const emojis = extractAllEmojis(m.content)
      for (let i = 0; i < emojis.length; i ++) {
        if (enable_emojis[emojis[i]]) {
          users[m.quote.author.nickname][emojis[i]] = (users[m.quote.author.nickname][emojis[i]] ?? 0) + 1
        }
      }
    }
  }
  return users
}

function extractImageUrlsFromMessage(message: KookMessage): string[] {
  const type = message?.type
  const content = message?.content

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

  const extractFromCard = (card: any): string[] => {
    const urls: string[] = []
    card.modules.filter((a: any) => a.type == 'container').forEach((c: any) => {
      c.elements.filter((e: any) => e.type == 'image').forEach((e: any) => {
        urls.push(e.src)
      })
    })
    return urls
  }
  const urls: string[] = []
  for (let i = 0; i < cardList.length; i ++) {
    const tmp = extractFromCard(cardList[i])
    urls.push(...tmp)
  }
  return urls
}

function getProxiedKookImageUrl(url: string): string {
  try {
    const u = new URL(url)
    // 替换 host 为反代地址
    let pathname = u.pathname
    if (!pathname.startsWith('/kook')) pathname = `/kook${pathname}`
    return `https://img.albionbox.com${pathname}${u.search}`
  } catch {
    return url
  }
}

function parseRewardValue(val: string | number): number {
  if (!val) return 0
  const parsed = parseFloat(String(val))
  return isNaN(parsed) ? 0 : parsed
}

function formatRewardValue(val: number): string {
  if (val === 0) return '0'
  return `${Number(val.toFixed(2))} m`
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
  const [replyTextByMsgId, setReplyTextByMsgId] = useState<Record<string, string>>({})
  const [replyAtByMsgId, setReplyAtByMsgId] = useState<Record<string, boolean>>({})
  const [replyingByMsgId, setReplyingByMsgId] = useState<Record<string, boolean>>({})

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

  // 图片查重相关状态
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{hash: string, items: {msg: KookMessage, url: string}[]}>>([])
  const [checkProgress, setCheckProgress] = useState<{current: number, total: number} | null>(null)
  const [checkStats, setCheckStats] = useState<{msgCount: number, imgCount: number} | null>(null)
  
  // 缓存已经计算过 Hash 的图片 URL，避免翻页后重复计算
  // key = url, value = hash
  const [urlHashCache, setUrlHashCache] = useState<Map<string, string>>(new Map())

  // 单条消息主动 Hash 计算状态
  const [calculatingHashMsgId, setCalculatingHashMsgId] = useState<Record<string, boolean>>({})

  // 表情分析状态
  const [reactionStats, setReactionStats] = useState<Record<string, Record<string, number>> | null>(null)
  
  const DEFAULT_EMOJI_REWARDS: Record<string, string> = {
    '🟢': '0.1', 
    '🔵': '0.2', 
    '🟣': '0.3', 
    '🟡': '0.5',
    '❓': '0',
    '🔁': '0'
  }
  const [emojiRewards, setEmojiRewards] = useState<Record<string, string>>(DEFAULT_EMOJI_REWARDS)
  const [anchorMessage, setAnchorMessage] = useState<{ id: string; create_at?: number; content: string } | null>(null)
  const [anchorPickerOpen, setAnchorPickerOpen] = useState(false)
  const [anchorStartsWith, setAnchorStartsWith] = useState('')

  const [systemGuilds, setSystemGuilds] = useState<SystemGuild[]>([])
  const [selectedSystemGuildId, setSelectedSystemGuildId] = useState<string>('')
  const [providerBindings, setProviderBindings] = useState<Record<string, { gameAccountUsername: string; albionPlayerId: string }>>({})
  const [bindingTarget, setBindingTarget] = useState<{ providerId: string; providerName?: string } | null>(null)
  const [bindingSaving, setBindingSaving] = useState(false)
  const [bindingError, setBindingError] = useState<string | null>(null)
  const [selectedBindingPlayer, setSelectedBindingPlayer] = useState<{ Id: string; Name: string } | null>(null)

  const kookUsers = useMemo(() => {
    const map = new Map<string, { providerId: string; providerName?: string }>()
    for (const m of messages) {
      const id = m.author?.id
      if (id && !map.has(id)) {
        map.set(id, { providerId: id, providerName: m.author?.nickname || m.author?.username || undefined })
      }
      const qid = m.quote?.author?.id
      if (qid && !map.has(qid)) {
        map.set(qid, { providerId: qid, providerName: m.quote?.author?.nickname || m.quote?.author?.username || undefined })
      }
    }
    return Array.from(map.values())
  }, [messages])

  const nicknameToKookId = useMemo(() => {
    const mapping: Record<string, string> = {}
    for (const m of messages) {
      const nickname = m.author?.nickname
      const id = m.author?.id
      if (nickname && id && !mapping[nickname]) mapping[nickname] = id
      const qn = m.quote?.author?.nickname
      const qid = m.quote?.author?.id
      if (qn && qid && !mapping[qn]) mapping[qn] = qid
    }
    return mapping
  }, [messages])

  const messagesAfterAnchor = useMemo(() => {
    if (!anchorMessage?.create_at) return messages
    const anchorTs = anchorMessage.create_at
    return messages.filter(m => (m.create_at ?? 0) >= anchorTs)
  }, [messages, anchorMessage])

  const reactionCsvRows = useMemo(() => {
    if (!reactionStats) return []

    const activeUsers = Object.keys(reactionStats).filter(nickname => {
      const emojis = reactionStats[nickname]
      return ['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].some(emoji => (emojis?.[emoji] ?? 0) > 0)
    })

    const userRewardList = activeUsers
      .map(nickname => {
        const total = ['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].reduce((sum, emoji) => {
          return sum + (reactionStats[nickname]?.[emoji] ?? 0) * parseRewardValue(emojiRewards[emoji])
        }, 0)
        return { nickname, total }
      })
      .sort((a, b) => b.total - a.total)

    return userRewardList.map(({ nickname }) => {
      const kookId = nicknameToKookId[nickname] ?? ''
      const username = selectedSystemGuildId && kookId ? (providerBindings[kookId]?.gameAccountUsername ?? '') : ''
      return {
        username,
        kookId,
        discordId: '',
        green: reactionStats[nickname]?.['🟢'] ?? 0,
        blue: reactionStats[nickname]?.['🔵'] ?? 0,
        purple: reactionStats[nickname]?.['🟣'] ?? 0,
        gold: reactionStats[nickname]?.['🟡'] ?? 0,
      }
    })
  }, [emojiRewards, nicknameToKookId, providerBindings, reactionStats, selectedSystemGuildId])

  const anchorCandidates = useMemo(() => {
    const prefix = (anchorStartsWith ?? '').trim()
    if (!prefix) return []
    const filtered = messages.filter(m => typeof m.content === 'string' && m.content.startsWith(prefix))
    return sortMessagesNewestFirst(filtered)
  }, [messages, anchorStartsWith])

  // 当选择的频道改变时，尝试从 localStorage 加载配置
  useEffect(() => {
    if (!selectedChannelId) return
    const saved = localStorage.getItem(`emojiRewards_${selectedChannelId}`)
    if (saved) {
      try {
        setEmojiRewards(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved emoji rewards', e)
        setEmojiRewards(DEFAULT_EMOJI_REWARDS)
      }
    } else {
      setEmojiRewards(DEFAULT_EMOJI_REWARDS)
    }
  }, [selectedChannelId])

  // 当配置改变且存在选中的频道时，保存到 localStorage
  useEffect(() => {
    if (selectedChannelId) {
      localStorage.setItem(`emojiRewards_${selectedChannelId}`, JSON.stringify(emojiRewards))
    }
  }, [emojiRewards, selectedChannelId])

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
    setUrlHashCache(new Map())
    setDuplicateGroups([])
    setCheckStats(null)
    setReactionStats(null)
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
    setUrlHashCache(new Map())
    setDuplicateGroups([])
    setCheckStats(null)
    setReactionStats(null)
    setReplyTextByMsgId({})
    setReplyAtByMsgId({})
    setReplyingByMsgId({})
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

  async function replyToMessage(message: KookMessage) {
    const raw = replyTextByMsgId[message.id] ?? ''
    const text = raw.trim()
    if (!text) return
    if (!selectedChannelId) {
      showToast('未选择频道')
      return
    }

    setReplyingByMsgId(prev => ({ ...prev, [message.id]: true }))
    setError(null)
    try {
      const shouldAt = !!replyAtByMsgId[message.id]
      const authorId = message.author?.id
      const content = shouldAt && authorId ? `(met)${authorId}(met) ${text}` : text

      const res = await (api as any).kook.messages.send.$post({
        json: {
          channelId: selectedChannelId,
          content,
          type: 9,
          quote: message.id,
        },
      })
      const json = await res.json().catch(() => null) as any
      if (!res.ok || json?.code !== 0) {
        throw new Error(json?.message || json?.error || '回复失败')
      }

      setReplyTextByMsgId(prev => ({ ...prev, [message.id]: '' }))
      showToast('已发送回复')
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setReplyingByMsgId(prev => ({ ...prev, [message.id]: false }))
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

  async function imageHash(url: string): Promise<string | null> {
    const proxiedUrl = getProxiedKookImageUrl(url)
    try {
      const res = await fetch(proxiedUrl)
      if (!res.ok) return null
      const blob = await res.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return hashHex
    } catch (e) {
      return null
    }
  }

  async function handleCheckDuplicates() {
    if (messages.length === 0 || checkingDuplicates) return
    setCheckingDuplicates(true)
    setDuplicateGroups([])
    
    // 1. 建立 url -> KookMessage[] 的映射，天然完成单条消息内或不同消息间的 url 去重
    let msgWithImageCount = 0
    let imageCount = 0
    const hashToItems = new Map<string, Array<{msg: KookMessage, url: string}>>()

    setCheckProgress({ current: 0, total: messages.length })

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      const urls = extractImageUrlsFromMessage(m)
      if (urls.length > 0) {
        msgWithImageCount++
        imageCount += urls.length
        for (const i in urls) {
          const url = urls[i]
          const hash = await imageHash(url)
          if (!hash) {
            // TODO: Aler!
            continue
          }
          if (!hashToItems.has(hash)) {
            hashToItems.set(hash, [])
          }
          const items = hashToItems.get(hash)!
          items.push({ msg: m, url })
        }
      }
      setCheckProgress({ current: i, total: messages.length })
    }

    setCheckStats({ msgCount: msgWithImageCount, imgCount: imageCount })

    const groups: Array<{hash: string, items: {msg: KookMessage, url: string}[]}> = []
    for (const [hash, items] of hashToItems.entries()) {
      // 只要同一个 hash 对应超过 1 个 items (即不同消息或不同url产生同一hash)，就认为是重复
      if (items.length > 1) {
        const sortedItems = [...items].sort((a, b) => (a.msg.create_at ?? 0) - (b.msg.create_at ?? 0))
        groups.push({ hash, items: sortedItems })
      }
    }
    
    setDuplicateGroups(groups)
    setCheckingDuplicates(false)
    setCheckProgress(null)
    
    setTimeout(() => {
      setDuplicateGroups((currentGroups) => {
        if (currentGroups.length === 0) {
          showToast('没有发现重复图片')
        } else {
          showToast(`发现 ${currentGroups.length} 组重复图片`)
        }
        return currentGroups
      })
    }, 100)
  }

  async function handleMarkDuplicates(group: {hash: string, items: {msg: KookMessage, url: string}[]}) {
    // 获取需要标记的 msg 列表。去重避免同一消息发两次 reaction
    const duplicateMsgs = group.items.slice(1).map(x => x.msg)
    const uniqueMsgs = Array.from(new Map(duplicateMsgs.map(m => [m.id, m])).values())

    if (uniqueMsgs.length === 0) return

    let markedCount = 0
    for (const msg of uniqueMsgs) {
      try {
        await addReaction(msg.id, '🔁')
        markedCount++
        await new Promise(r => setTimeout(r, 300))
      } catch (e) {
        console.error('Failed to mark duplicate:', msg.id, e)
      }
    }
    showToast(`成功标记 ${markedCount} 条重复消息 (🔁)`)
  }

  async function handleNotifyAllDuplicates() {
    if (duplicateGroups.length === 0) return

    // 弹出输入框获取通知内容
    const customText = window.prompt(
      '请输入要发送给作者的通知内容（会自动在最前面 @ 该作者）：',
      '您发送的图片已经被提交过了，请勿重复提交。'
    )
    if (!customText) return // 用户取消或未输入

    // 收集所有重复组里除了首发之外的重复消息
    const allDuplicateMsgs: KookMessage[] = []
    for (const group of duplicateGroups) {
      allDuplicateMsgs.push(...group.items.slice(1).map(x => x.msg))
    }

    // 根据 msg.id 去重（如果不同图片组或同一组有重复消息）
    const uniqueMsgs = Array.from(new Map(allDuplicateMsgs.map(m => [m.id, m])).values())

    if (uniqueMsgs.length === 0) {
      showToast('当前没有可通知的重复消息')
      return
    }

    let successCount = 0
    let failCount = 0

    for (const msg of uniqueMsgs) {
      try {
        const authorId = msg.author?.id
        if (!authorId) throw new Error('找不到作者 ID')

        // 发送消息
        const res = await (api as any).kook.messages.send.$post({
          json: {
            channelId: selectedChannelId,
            content: `(met)${authorId}(met) ${customText}`,
            type: 9, // KMarkdown
            quote: msg.id
          }
        })

        const json = await res.json().catch(() => null) as any
        if (!res.ok || json?.code !== 0) {
          throw new Error(json?.message || json?.error || '发送失败')
        }

        successCount++
        // 简单延时避免触发接口限流
        await new Promise(r => setTimeout(r, 500))
      } catch (e) {
        console.error('Failed to notify duplicate author:', msg.id, e)
        failCount++
      }
    }

    if (failCount > 0) {
      showToast(`批量通知结束：成功 ${successCount} 条，失败 ${failCount} 条`)
    } else {
      showToast(`成功批量通知了 ${successCount} 个重复消息的作者`)
    }
  }

  async function calculateHashForMessage(m: KookMessage) {
    const urls = extractImageUrlsFromMessage(m)
    if (urls.length === 0) {
      showToast('该消息中没有图片')
      return
    }

    setCalculatingHashMsgId(prev => ({ ...prev, [m.id]: true }))
    
    const newCache = new Map(urlHashCache)
    let calculatedCount = 0
    
    // 去重，单条消息内的相同url不需要重复算
    const uniqueUrls = Array.from(new Set(urls))
    
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i]
      if (newCache.has(url)) {
        calculatedCount++
        console.log(`[Hash Cache Hit] URI: ${url} | Hash: ${newCache.get(url)}`)
        continue
      }
      
      const proxiedUrl = getProxiedKookImageUrl(url)
      try {
        const res = await fetch(proxiedUrl)
        if (!res.ok) continue
        const blob = await res.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        
        newCache.set(url, hashHex)
        calculatedCount++
        console.log(`[Hash Calculated] URI: ${url} | Hash: ${hashHex}`)
      } catch (e) {
        console.error('Failed to fetch/hash image:', proxiedUrl, e)
      }
    }
    
    setUrlHashCache(newCache)
    setCalculatingHashMsgId(prev => ({ ...prev, [m.id]: false }))
    
    if (calculatedCount > 0) {
      showToast(`已计算该消息中 ${calculatedCount} 张唯一图片的 Hash`)
    } else {
      showToast('计算失败，未能获取到图片')
    }
  }

  function handleAnalyzeReactions() {
    if (messages.length === 0) {
      showToast('当前没有加载任何消息，无法分析')
      return
    }
    const stats = countEmoji(messagesAfterAnchor)
    setReactionStats(stats)
    showToast('表情回复分析完成')
  }

  function handleExportReactionCsv() {
    if (!selectedChannelId) {
      showToast('未选择频道')
      return
    }
    if (!reactionStats || reactionCsvRows.length === 0) {
      showToast('当前没有可导出的分析结果')
      return
    }

    const header = ['username', 'kookId', 'discordId', 'green', 'blue', 'purple', 'gold']
    const lines = [
      header.join(','),
      ...reactionCsvRows.map(r => {
        return [
          r.username,
          r.kookId,
          r.discordId,
          r.green,
          r.blue,
          r.purple,
          r.gold,
        ].map(escapeCsvValue).join(',')
      }),
    ]

    const anchorOrDate = anchorMessage?.id ? anchorMessage.id : formatDateKey(new Date())
    const fileName = `reaction_rewards_${selectedChannelId}_${anchorOrDate}.csv`
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast(`已导出 ${reactionCsvRows.length} 行`)
  }

  async function loadProviderBindings(guildId: string) {
    setBindingError(null)
    setProviderBindings({})
    if (!guildId) return
    try {
      const res = await ((api as any).guilds as any)[':id'].provider_bindings.$get({
        param: { id: guildId },
        query: { provider: 'kook' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any
        setBindingError(data?.error ?? '加载绑定失败')
        return
      }
      const data = await res.json().catch(() => null) as any
      const items = data?.items ?? []
      const mapping: Record<string, { gameAccountUsername: string; albionPlayerId: string }> = {}
      for (const item of items) {
        if (item?.providerId) {
          mapping[item.providerId] = { gameAccountUsername: item.gameAccountUsername, albionPlayerId: item.albionPlayerId }
        }
      }
      setProviderBindings(mapping)
    } catch (e: any) {
      setBindingError(e?.message ?? String(e))
    }
  }

  async function submitBinding() {
    if (!selectedSystemGuildId || !bindingTarget || !selectedBindingPlayer) return
    setBindingSaving(true)
    setBindingError(null)
    try {
      const res = await ((api as any).guilds as any)[':id'].provider_bindings.$put({
        param: { id: selectedSystemGuildId },
        json: {
          provider: 'kook',
          providerId: bindingTarget.providerId,
          providerName: bindingTarget.providerName,
          gameAccount: {
            username: selectedBindingPlayer.Name,
            albionPlayerId: selectedBindingPlayer.Id,
          },
        },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as any
        setBindingError(data?.error ?? '绑定失败')
        return
      }
      setBindingTarget(null)
      setSelectedBindingPlayer(null)
      await loadProviderBindings(selectedSystemGuildId)
    } catch (e: any) {
      setBindingError(e?.message ?? String(e))
    } finally {
      setBindingSaving(false)
    }
  }

  useEffect(() => {
    loadGuilds()
  }, [])

  useEffect(() => {
    const loadSystemGuilds = async () => {
      try {
        const res = await api.guilds.$get()
        if (!res.ok) return
        const data = await res.json() as any[]
        setSystemGuilds((data ?? []).map((g: any) => ({ id: g.id, name: g.name, server: g.server })))
      } catch (e) {
        console.error(e)
      }
    }
    loadSystemGuilds()
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

      {/* 图片查重面板 */}
      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-amber-200 uppercase tracking-widest">图片查重</div>
          <div className="text-xs text-slate-400">扫描当前已加载的消息中的图片，通过计算 SHA-256 Hash 找出重复图片并可自动标记（🔁）。</div>
        </div>
        
        <div className="flex flex-col md:flex-row items-end gap-3">
          <button
            className="w-full md:w-auto px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-black rounded-xl border border-amber-500/30 disabled:opacity-50 uppercase tracking-widest text-xs"
            onClick={handleCheckDuplicates}
            disabled={checkingDuplicates || messages.length === 0}
          >
            {checkingDuplicates ? '扫描中...' : '开始扫描当前消息'}
          </button>
        </div>

        {checkProgress && (
          <div className="text-xs text-slate-300">
            扫描进度: <span className="font-bold text-white">{checkProgress.current}</span> / {checkProgress.total}
          </div>
        )}

        {checkStats && !checkingDuplicates && (
          <div className="text-xs text-slate-300">
            共扫描含图片消息: <span className="font-bold text-white">{checkStats.msgCount}</span> 条
            <span className="mx-2 text-slate-600">|</span> 
            提取独立图片: <span className="font-bold text-emerald-400">{checkStats.imgCount}</span> 张
          </div>
        )}

        {duplicateGroups.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white">发现 {duplicateGroups.length} 组重复：</div>
              <button
                className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-black rounded-xl border border-sky-500/30 uppercase tracking-widest text-[10px]"
                onClick={handleNotifyAllDuplicates}
              >
                一键通知所有重复作者
              </button>
            </div>
            {duplicateGroups.map((group, idx) => (
              <div key={group.hash} className="bg-black-bg border border-black-border rounded-xl p-3 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="text-xs text-slate-400 font-mono">Hash: {group.hash.substring(0, 16)}...</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded-lg text-[10px]"
                      onClick={() => handleMarkDuplicates(group)}
                    >
                      标记重复项 (🔁)
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item, i) => {
                    const m = item.msg
                    const time = formatTs(m.create_at)
                    return (
                      <div key={`${m.id}-${i}`} className={`text-xs p-2 rounded-lg border ${i === 0 ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10'}`}>
                        <div className="font-bold mb-1">{i === 0 ? '首发 (原图)' : '重复'}</div>
                        <div>ID: <span className="font-mono">{m.id}</span></div>
                        <div>时间: {time}</div>
                        <div className="truncate w-32">作者: {m.author?.nickname || m.author?.username || 'Unknown'}</div>
                        <img src={getProxiedKookImageUrl(item.url)} className="h-16 mt-2 rounded border border-black-border object-cover" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 表情回复分析面板 */}
      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-purple-300 uppercase tracking-widest">表情回复分析与奖励计算</div>
          <div className="text-xs text-slate-400">统计各用户获得的表情回复，并根据预设的数值计算奖励总额。（未收到任何表情的用户不会展示）</div>
        </div>

        <div className="bg-black-bg border border-black-border rounded-xl p-3">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">表情奖励配置 (单位: m)</div>
          <div className="flex flex-wrap items-center gap-3">
            {['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].map(emoji => (
              <div key={emoji} className="flex items-center gap-2 bg-black-card border border-black-border rounded-lg px-2 py-1">
                <span className="text-sm">{emoji}</span>
                <input
                  type="text"
                  className="w-16 bg-transparent text-white text-xs font-mono focus:outline-none focus:border-purple-500 border-b border-black-border/50 text-right"
                  value={emojiRewards[emoji]}
                  onChange={e => setEmojiRewards(prev => ({ ...prev, [emoji]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-end gap-3">
          <button
            className="w-full md:w-auto px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-black rounded-xl border border-purple-500/30 disabled:opacity-50 uppercase tracking-widest text-xs"
            onClick={handleAnalyzeReactions}
            disabled={messages.length === 0}
          >
            开始分析当前消息
          </button>
          <button
            className="w-full md:w-auto px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-black rounded-xl border border-emerald-500/30 disabled:opacity-50 uppercase tracking-widest text-xs"
            onClick={handleExportReactionCsv}
            disabled={!reactionStats || reactionCsvRows.length === 0 || !selectedChannelId}
          >
            导出 CSV
          </button>
          <button
            className="w-full md:w-auto px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-xs"
            onClick={() => setAnchorPickerOpen(true)}
            disabled={messages.length === 0}
          >
            选择锚定
          </button>
          {anchorMessage && (
            <button
              className="w-full md:w-auto px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-black rounded-xl border border-rose-500/30 uppercase tracking-widest text-xs"
              onClick={() => { setAnchorMessage(null); setReactionStats(null) }}
            >
              清除锚定
            </button>
          )}
          <div className="text-xs text-slate-400 md:ml-auto">
            统计范围：{messagesAfterAnchor.length}/{messages.length}
            {anchorMessage?.create_at ? `（锚定：${formatTs(anchorMessage.create_at)}）` : ''}
          </div>
        </div>

        {reactionStats && (
          <div className="space-y-3 mt-4">
            {Object.keys(reactionStats).length === 0 ? (
              <div className="text-xs text-slate-400">当前加载的消息中没有任何表情回复记录。</div>
            ) : (() => {
              // 过滤掉没有任何相关 emoji 的用户
              const activeUsers = Object.keys(reactionStats).filter(nickname => {
                const emojis = reactionStats[nickname]
                return ['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].some(emoji => emojis[emoji] > 0)
              })

              if (activeUsers.length === 0) {
                return <div className="text-xs text-slate-400">当前加载的消息中没有匹配配置中表情的记录。</div>
              }

              // 计算每个人的总奖励并排序
              const userRewardList = activeUsers.map(nickname => {
                const total = ['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].reduce((sum, emoji) => {
                  return sum + (reactionStats[nickname][emoji] || 0) * parseRewardValue(emojiRewards[emoji])
                }, 0)
                return { nickname, total }
              }).sort((a, b) => b.total - a.total)

              // 计算总发放奖励
              const totalReward = userRewardList.reduce((sum, user) => sum + user.total, 0)

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <div className="text-xs font-bold text-purple-200 uppercase tracking-widest">
                      奖励发放总额
                    </div>
                    <div className="text-2xl font-black text-white font-mono">
                      {formatRewardValue(totalReward)}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-black-border">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">
                            User
                          </th>
                          <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">
                            KookId
                          </th>
                          {['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].map(emoji => (
                            <th key={emoji} className="p-3 border-b border-black-border bg-black-bg text-center min-w-[40px]">
                              {emoji}
                            </th>
                          ))}
                          <th className="p-3 border-b border-black-border bg-black-bg text-purple-300 font-black text-right whitespace-nowrap">
                            总奖励
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {userRewardList.map((userItem, idx, arr) => {
                          const nickname = userItem.nickname
                          const userTotal = userItem.total

                          return (
                            <tr key={nickname} className={idx === arr.length - 1 ? '' : 'border-b border-black-border/50'}>
                              <td className="p-3 font-bold text-white whitespace-nowrap bg-black-card/50">
                                {nickname}
                              </td>
                              <td className="p-3 text-slate-300 whitespace-nowrap bg-black-card/50 font-mono">
                                {nicknameToKookId[nickname] ?? '-'}
                              </td>
                              {['🟢', '🔵', '🟣', '🟡', '❓', '🔁'].map(emoji => {
                                const count = reactionStats[nickname][emoji] || 0
                                const bgIntensity = count > 0 ? `rgba(168, 85, 247, ${Math.min(count * 0.1, 0.8)})` : 'transparent'
                                return (
                                  <td 
                                    key={emoji} 
                                    className={`p-3 text-center transition-colors ${count > 0 ? 'text-purple-200 font-black' : 'text-slate-700'}`}
                                    style={{ backgroundColor: bgIntensity }}
                                  >
                                    {count > 0 ? count : '-'}
                                  </td>
                                )
                              })}
                              <td className="p-3 font-black text-purple-200 text-right font-mono bg-purple-500/5">
                                {formatRewardValue(userTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {anchorPickerOpen && (
        <Modal
          title="选择锚定消息"
          onClose={() => setAnchorPickerOpen(false)}
          className="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              设置锚定后，会忽略锚定消息之前（更早）的所有消息。
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">StartsWith 过滤</div>
              <input
                type="text"
                className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 font-mono"
                value={anchorStartsWith}
                onChange={(e) => setAnchorStartsWith(e.target.value)}
                placeholder="输入消息内容前缀，例如：#结算"
              />
              <div className="text-xs text-slate-500">
                匹配到 {anchorCandidates.length} 条消息（基于当前已加载的消息列表）。
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-black-border max-h-[420px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">时间</th>
                    <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">ID</th>
                    <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">内容</th>
                    <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {anchorCandidates.map((m) => (
                    <tr key={m.id} className="border-b border-black-border/50">
                      <td className="p-3 text-slate-300 font-mono whitespace-nowrap">{formatTs(m.create_at)}</td>
                      <td className="p-3 text-slate-300 font-mono whitespace-nowrap">{m.id}</td>
                      <td className="p-3 text-slate-200">
                        <div className="truncate max-w-[520px]" title={m.content}>
                          {m.content}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          className="px-3 py-1 bg-gold hover:bg-gold-hover text-black font-black rounded-lg disabled:opacity-50 uppercase tracking-widest text-[10px]"
                          onClick={() => {
                            setAnchorMessage({ id: m.id, create_at: m.create_at, content: m.content })
                            setReactionStats(null)
                            setAnchorPickerOpen(false)
                          }}
                        >
                          设为锚定
                        </button>
                      </td>
                    </tr>
                  ))}
                  {anchorStartsWith.trim() && anchorCandidates.length === 0 && (
                    <tr>
                      <td className="p-4 text-slate-500 text-sm" colSpan={4}>未找到符合前缀的消息。</td>
                    </tr>
                  )}
                  {!anchorStartsWith.trim() && (
                    <tr>
                      <td className="p-4 text-slate-500 text-sm" colSpan={4}>请输入 startsWith 前缀后再筛选。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-black-card border border-black-border rounded-2xl p-4 shadow-xl space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-black text-sky-300 uppercase tracking-widest">KOOK 用户绑定游戏角色</div>
          <div className="text-xs text-slate-400">选择系统工会后，展示当前加载消息中出现的 KOOK 用户及其绑定状态。</div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">系统工会</div>
            <select
              className="w-full bg-black-bg border border-black-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              value={selectedSystemGuildId}
              onChange={(e) => {
                const v = e.target.value
                setSelectedSystemGuildId(v)
                loadProviderBindings(v)
              }}
            >
              <option value="">请选择工会</option>
              {systemGuilds.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-400">当前用户数：{kookUsers.length}</div>
        </div>

        {bindingError ? <div className="text-rose-400 text-sm">{bindingError}</div> : null}

        <div className="overflow-x-auto rounded-xl border border-black-border">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">KookId</th>
                <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">Name</th>
                <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">Albion</th>
                <th className="p-3 border-b border-black-border bg-black-bg text-slate-400 font-bold whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {kookUsers.map((u) => {
                const binding = providerBindings[u.providerId]
                return (
                  <tr key={u.providerId} className="border-b border-black-border/50">
                    <td className="p-3 text-slate-300 font-mono whitespace-nowrap">{u.providerId}</td>
                    <td className="p-3 text-white font-bold whitespace-nowrap">{u.providerName ?? '-'}</td>
                    <td className="p-3 text-slate-200 whitespace-nowrap">
                      {binding ? (
                        <span className="font-mono">{binding.gameAccountUsername} ({binding.albionPlayerId})</span>
                      ) : (
                        <span className="text-slate-500">未绑定</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-black rounded-lg border border-sky-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                        onClick={() => { if (!selectedSystemGuildId) return; setBindingTarget(u); setSelectedBindingPlayer(null); setBindingError(null); }}
                        disabled={!selectedSystemGuildId}
                      >
                        {binding ? '更换绑定' : '绑定'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {kookUsers.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500 text-sm" colSpan={4}>当前没有可绑定的 KOOK 用户（请先加载消息）。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bindingTarget && selectedSystemGuildId && (
        <Modal
          title="绑定游戏角色"
          onClose={() => { if (bindingSaving) return; setBindingTarget(null); setSelectedBindingPlayer(null); }}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              KOOK: <span className="text-white font-mono">{bindingTarget.providerId}</span> {bindingTarget.providerName ? `(${bindingTarget.providerName})` : ''}
            </div>
            <AlbionPlayerSearch
              guildId={selectedSystemGuildId}
              autoFocus
              onSelect={(p) => setSelectedBindingPlayer({ Id: p.Id, Name: p.Name })}
              isSelected={(p) => selectedBindingPlayer?.Id === p.Id}
            />
            {selectedBindingPlayer ? (
              <div className="text-xs text-slate-300">
                已选择：<span className="text-white font-bold">{selectedBindingPlayer.Name}</span> <span className="font-mono text-slate-400">({selectedBindingPlayer.Id})</span>
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 bg-black-bg hover:bg-black-border text-white font-black rounded-xl border border-black-border disabled:opacity-50 uppercase tracking-widest text-[10px]"
                onClick={() => { if (bindingSaving) return; setBindingTarget(null); setSelectedBindingPlayer(null); }}
                disabled={bindingSaving}
              >
                取消
              </button>
              <button
                className="px-4 py-2 bg-gold hover:bg-gold-hover text-black font-black rounded-xl disabled:opacity-50 uppercase tracking-widest text-[10px]"
                onClick={submitBinding}
                disabled={bindingSaving || !selectedBindingPlayer}
              >
                {bindingSaving ? '绑定中...' : '确认绑定'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                      {extractImageUrlsFromMessage(m).length > 0 && (
                        <button
                          className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-black rounded-lg border border-amber-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                          onClick={() => calculateHashForMessage(m)}
                          disabled={!!calculatingHashMsgId[m.id]}
                        >
                          {calculatingHashMsgId[m.id] ? '计算Hash中...' : '计算图片Hash'}
                        </button>
                      )}
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

                  <div className="flex flex-col gap-2">
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

                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <input
                        value={replyTextByMsgId[m.id] ?? ''}
                        onChange={(e) => setReplyTextByMsgId(prev => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="回复内容..."
                        className="flex-1 min-w-0 bg-black-bg border border-black-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50"
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={!!replyAtByMsgId[m.id]}
                          onChange={(e) => setReplyAtByMsgId(prev => ({ ...prev, [m.id]: e.target.checked }))}
                          className="accent-sky-500"
                        />
                        <span>☑️ @作者</span>
                      </label>
                      <button
                        className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-black rounded-lg border border-sky-500/30 disabled:opacity-50 uppercase tracking-widest text-[10px]"
                        onClick={() => replyToMessage(m)}
                        disabled={!!replyingByMsgId[m.id] || !(replyTextByMsgId[m.id] ?? '').trim()}
                      >
                        {replyingByMsgId[m.id] ? '回复中...' : '回复'}
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === 'json' ? (
                  <pre className="text-xs bg-black-bg border border-black-border text-emerald-200 p-3 rounded-xl overflow-x-auto">{JSON.stringify(m, null, 2)}</pre>
                ) : (
                  <div className="space-y-2">
                    {m.type === 2 ? (
                      <div className="relative inline-block max-w-full">
                        <img src={getProxiedKookImageUrl(m.content)} className="max-w-full rounded-xl border border-black-border" />
                        {urlHashCache.has(m.content) && (
                          <div className="absolute top-2 left-2 bg-black/80 text-amber-300 px-2 py-1 rounded text-[10px] font-mono shadow border border-amber-500/30 backdrop-blur-sm z-10">
                            Hash: {urlHashCache.get(m.content)?.substring(0, 16)}...
                          </div>
                        )}
                      </div>
                    ) : null}
                    {m.type === 9 ? (
                      <div className="rounded-xl border border-black-border bg-black-bg overflow-hidden">
                        <MessagePreview type="kmd" theme="dark" content={m.content} external={KOOK_KMD_WASM_EXTERNAL} />
                      </div>
                    ) : null}
                    {m.type === 10 ? (
                      parsedCard ? (
                        <div className="rounded-xl border border-black-border bg-black-bg overflow-hidden">
                          <MessagePreview type="card" theme="dark" content={parsedCard.map(card => {
                            // 深度克隆并替换卡片内所有图片链接
                            const newCard = JSON.parse(JSON.stringify(card))
                            const traverseAndReplace = (obj: any) => {
                              if (!obj || typeof obj !== 'object') return
                              if (Array.isArray(obj)) {
                                obj.forEach(traverseAndReplace)
                              } else {
                                const processImageElement = (el: any) => {
                                  if (el && typeof el.src === 'string' && el.src) {
                                    const originalSrc = el.src
                                    el.src = getProxiedKookImageUrl(originalSrc)
                                    // 检查是否计算过 hash，如果有，将 hash 注入到 alt 里供 UI 显示
                                    const hashHex = urlHashCache.get(originalSrc)
                                    if (hashHex) {
                                      el.alt = `Hash: ${hashHex.substring(0, 16)}...`
                                    }
                                  }
                                }

                                if (obj.type === 'container' && Array.isArray(obj.elements)) {
                                  obj.elements.forEach(processImageElement)
                                } else if (obj.type === 'image' && typeof obj.src === 'string' && obj.src) {
                                  processImageElement(obj)
                                } else if (obj.type === 'image-group' && Array.isArray(obj.elements)) {
                                  obj.elements.forEach(processImageElement)
                                }
                                Object.values(obj).forEach(traverseAndReplace)
                              }
                            }
                            traverseAndReplace(newCard)
                            return newCard
                          })} external={KOOK_KMD_WASM_EXTERNAL} collapsed />
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
