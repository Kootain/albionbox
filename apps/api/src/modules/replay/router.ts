import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, inArray, desc, gte, lte } from 'drizzle-orm'
import {
  CreateReplayVideoSchema,
  CreateReplayHighlightSchema,
  CreateReplayCommentSchema,
  SyncReplayVideoSchema,
  UpdateReplayHighlightSchema,
  UpdateReplayCommentSchema,
  UpdateReplayVideoSchema
} from '@albionbox/shared'
import { replayVideos, replayHighlights, replayComments } from '@albionbox/db'
import { authMiddleware } from '../users/auth.middleware'
import type { AppContext } from '../../context'

import { getPlayInfo } from './volcengine'

const factory = createFactory<AppContext>()
const router = new Hono<AppContext>()

const createVideoHandler = factory.createHandlers(authMiddleware, zValidator('json', CreateReplayVideoSchema), async (c) => {
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(replayVideos).values({
    id,
    vid: data.vid,
    duration: data.duration ?? null,
    username: data.username,
    date: data.date,
    role: data.role,
    absoluteStartTime: data.absoluteStartTime ?? null,
    createdAt: now,
  }).execute()

  return c.json({ id, message: 'Replay video created successfully' }, 201)
})

const getVideosHandler = factory.createHandlers(authMiddleware, async (c) => {
  const db = drizzle(c.env.DB)
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')

  let conditions = []
  if (startDate) {
    conditions.push(gte(replayVideos.createdAt, startDate))
  }
  if (endDate) {
    conditions.push(lte(replayVideos.createdAt, endDate))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const videos = await db.select().from(replayVideos).where(whereClause).orderBy(desc(replayVideos.createdAt)).all()
  if (videos.length === 0) {
    return c.json({ data: [] })
  }

  const videoIds = videos.map(v => v.id)
  const highlights = await db.select().from(replayHighlights).where(inArray(replayHighlights.videoId, videoIds)).all()
  
  const highlightIds = highlights.map(h => h.id)
  const comments = highlightIds.length > 0 
    ? await db.select().from(replayComments).where(inArray(replayComments.highlightId, highlightIds)).all()
    : []

  const commentsByHighlightId = comments.reduce((acc, comment) => {
    if (!acc[comment.highlightId]) acc[comment.highlightId] = []
    acc[comment.highlightId].push(comment)
    return acc
  }, {} as Record<string, typeof comments>)

  const highlightsByVideoId = highlights.reduce((acc, highlight) => {
    if (!acc[highlight.videoId]) acc[highlight.videoId] = []
    acc[highlight.videoId].push({
      ...highlight,
      comments: commentsByHighlightId[highlight.id] || []
    })
    return acc
  }, {} as Record<string, any[]>)

  const data = await Promise.all(videos.map(async (video) => {
    let videoUrl = null
    let transcodeStatus = video.transcodeStatus

    if (video.vid) {
      // Cloudflare stream-media-id is typically a 32-character hex string without 'v' prefix
      if (video.vid.length === 32 && !video.vid.startsWith('v')) {
        videoUrl = `cloudflare:${video.vid}`
      } else {
        if (transcodeStatus && Object.keys(transcodeStatus).length > 0) {
          // If we have cached multi-bitrate URLs, use them instead of querying again
          // Fallback to the first available URL for `videoUrl` just in case some old clients rely on it
          const firstKey = Object.keys(transcodeStatus)[0]
          videoUrl = transcodeStatus[firstKey]
        } else {
          // Query Volcengine
          const playInfo = await getPlayInfo(
            video.vid,
            c.env.VOLC_ACCESS_KEY_ID as string,
            c.env.VOLC_SECRET_ACCESS_KEY as string
          )
          if (playInfo) {
            transcodeStatus = playInfo
            const firstKey = Object.keys(playInfo)[0]
            videoUrl = playInfo[firstKey]
            
            // Optionally, update the DB with this transcodeStatus so we don't have to query again
            // but usually this is handled by the webhook. We do it just in case.
            // Avoid awaiting here to not block the response
            c.executionCtx.waitUntil(
              db.update(replayVideos).set({ transcodeStatus: playInfo }).where(eq(replayVideos.id, video.id)).execute()
            )
          }
        }
      }
    }

    return {
      ...video,
      videoUrl,
      transcodeStatus,
      highlights: highlightsByVideoId[video.id] || []
    }
  }))

  return c.json({ data })
})

const syncVideoHandler = factory.createHandlers(authMiddleware, zValidator('json', SyncReplayVideoSchema), async (c) => {
  const id = c.req.param('id')!
  const { absoluteStartTime } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const video = await db.select().from(replayVideos).where(eq(replayVideos.id, id)).get()
  if (!video) return c.json({ error: 'Video not found' }, 404)

  await db.update(replayVideos).set({ absoluteStartTime }).where(eq(replayVideos.id, id)).execute()

  return c.json({ message: 'Absolute start time synced successfully' })
})

const createHighlightHandler = factory.createHandlers(authMiddleware, zValidator('json', CreateReplayHighlightSchema), async (c) => {
  const videoId = c.req.param('id')!
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const video = await db.select().from(replayVideos).where(eq(replayVideos.id, videoId)).get()
  if (!video) return c.json({ error: 'Video not found' }, 404)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(replayHighlights).values({
    id,
    videoId,
    timestamp: data.timestamp,
    absoluteTime: data.absoluteTime ?? null,
    createdAt: now,
  }).execute()

  return c.json({ id, message: 'Highlight created successfully' }, 201)
})

const createCommentHandler = factory.createHandlers(authMiddleware, zValidator('json', CreateReplayCommentSchema), async (c) => {
  const highlightId = c.req.param('highlightId')!
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const highlight = await db.select().from(replayHighlights).where(eq(replayHighlights.id, highlightId)).get()
  if (!highlight) return c.json({ error: 'Highlight not found' }, 404)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(replayComments).values({
    id,
    highlightId,
    username: data.username,
    content: data.content,
    createdAt: now,
  }).execute()

  return c.json({ id, message: 'Comment created successfully' }, 201)
})

const deleteVideoHandler = factory.createHandlers(authMiddleware, async (c) => {
  const id = c.req.param('id')!
  const db = drizzle(c.env.DB)

  const video = await db.select().from(replayVideos).where(eq(replayVideos.id, id)).get()
  if (!video) return c.json({ error: 'Video not found' }, 404)

  const highlights = await db.select().from(replayHighlights).where(eq(replayHighlights.videoId, id)).all()
  const highlightIds = highlights.map(h => h.id)
  
  if (highlightIds.length > 0) {
    await db.delete(replayComments).where(inArray(replayComments.highlightId, highlightIds)).execute()
    await db.delete(replayHighlights).where(eq(replayHighlights.videoId, id)).execute()
  }
  
  await db.delete(replayVideos).where(eq(replayVideos.id, id)).execute()

  return c.json({ message: 'Video deleted successfully' })
})

const updateVideoHandler = factory.createHandlers(authMiddleware, zValidator('json', UpdateReplayVideoSchema), async (c) => {
  const id = c.req.param('id')!
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const video = await db.select().from(replayVideos).where(eq(replayVideos.id, id)).get()
  if (!video) return c.json({ error: 'Video not found' }, 404)

  const updateData: any = {}
  if (data.role !== undefined) updateData.role = data.role
  if (data.date !== undefined) updateData.date = data.date

  if (Object.keys(updateData).length > 0) {
    await db.update(replayVideos).set(updateData).where(eq(replayVideos.id, id)).execute()
  }

  return c.json({ message: 'Video updated successfully' })
})

const deleteHighlightHandler = factory.createHandlers(authMiddleware, async (c) => {
  const id = c.req.param('id')!
  const db = drizzle(c.env.DB)

  const highlight = await db.select().from(replayHighlights).where(eq(replayHighlights.id, id)).get()
  if (!highlight) return c.json({ error: 'Highlight not found' }, 404)

  await db.delete(replayComments).where(eq(replayComments.highlightId, id)).execute()
  await db.delete(replayHighlights).where(eq(replayHighlights.id, id)).execute()

  return c.json({ message: 'Highlight deleted successfully' })
})

const updateHighlightHandler = factory.createHandlers(authMiddleware, zValidator('json', UpdateReplayHighlightSchema), async (c) => {
  const id = c.req.param('id')!
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const highlight = await db.select().from(replayHighlights).where(eq(replayHighlights.id, id)).get()
  if (!highlight) return c.json({ error: 'Highlight not found' }, 404)

  const updateData: any = {}
  if (data.timestamp !== undefined) updateData.timestamp = data.timestamp
  if (data.absoluteTime !== undefined) updateData.absoluteTime = data.absoluteTime

  if (Object.keys(updateData).length > 0) {
    await db.update(replayHighlights).set(updateData).where(eq(replayHighlights.id, id)).execute()
  }

  return c.json({ message: 'Highlight updated successfully' })
})

const deleteCommentHandler = factory.createHandlers(authMiddleware, async (c) => {
  const id = c.req.param('id')!
  const db = drizzle(c.env.DB)

  const comment = await db.select().from(replayComments).where(eq(replayComments.id, id)).get()
  if (!comment) return c.json({ error: 'Comment not found' }, 404)

  await db.delete(replayComments).where(eq(replayComments.id, id)).execute()

  return c.json({ message: 'Comment deleted successfully' })
})

const updateCommentHandler = factory.createHandlers(authMiddleware, zValidator('json', UpdateReplayCommentSchema), async (c) => {
  const id = c.req.param('id')!
  const data = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const comment = await db.select().from(replayComments).where(eq(replayComments.id, id)).get()
  if (!comment) return c.json({ error: 'Comment not found' }, 404)

  await db.update(replayComments).set({ content: data.content }).where(eq(replayComments.id, id)).execute()

  return c.json({ message: 'Comment updated successfully' })
})

const getGlobalHighlightsHandler = factory.createHandlers(authMiddleware, async (c) => {
  const db = drizzle(c.env.DB)
  const startTime = c.req.query('startTime')
  const endTime = c.req.query('endTime')

  if (!startTime || !endTime) {
    return c.json({ error: 'startTime and endTime are required' }, 400)
  }

  const start = parseInt(startTime, 10)
  const end = parseInt(endTime, 10)

  if (isNaN(start) || isNaN(end)) {
    return c.json({ error: 'Invalid startTime or endTime' }, 400)
  }

  const conditions = [
    gte(replayHighlights.absoluteTime, start),
    lte(replayHighlights.absoluteTime, end)
  ]

  const highlights = await db.select({
    highlight: replayHighlights,
    video: replayVideos,
  })
    .from(replayHighlights)
    .innerJoin(replayVideos, eq(replayHighlights.videoId, replayVideos.id))
    .where(and(...conditions))
    .all()

  if (highlights.length === 0) {
    return c.json({ data: [] })
  }

  const highlightIds = highlights.map(h => h.highlight.id)
  const comments = await db.select().from(replayComments).where(inArray(replayComments.highlightId, highlightIds)).all()

  const commentsByHighlightId = comments.reduce((acc, comment) => {
    if (!acc[comment.highlightId]) acc[comment.highlightId] = []
    acc[comment.highlightId].push(comment)
    return acc
  }, {} as Record<string, typeof comments>)

  const data = highlights.map(h => ({
    ...h.highlight,
    username: h.video.username,
    comments: commentsByHighlightId[h.highlight.id] || []
  }))

  return c.json({ data })
})

const getCloudflareDirectUploadUrlHandler = factory.createHandlers(authMiddleware, async (c) => {
  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = c.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    return c.json({ error: 'Cloudflare configuration is missing on server' }, 500)
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiToken}`,
    'Tus-Resumable': '1.0.0',
  }
  
  const uploadLength = c.req.header('Upload-Length') || c.req.header('upload-length')
  if (uploadLength) headers['Upload-Length'] = uploadLength
  
  let uploadMetadata = c.req.header('Upload-Metadata') || c.req.header('upload-metadata') || ''
  
  if (!uploadMetadata.toLowerCase().includes('maxdurationseconds')) {
    // Default max duration to 2 hours (7200 seconds)
    // This prevents Cloudflare from pre-allocating the default 4 hours (240 mins) of quota,
    // which can cause "Storage capacity exceeded" errors if the account has less than 240 mins left.
    const maxDurationEncoded = btoa('7200')
    if (uploadMetadata) {
      uploadMetadata += `,maxdurationseconds ${maxDurationEncoded}`
    } else {
      uploadMetadata = `maxdurationseconds ${maxDurationEncoded}`
    }
  }
  
  if (uploadMetadata) headers['Upload-Metadata'] = uploadMetadata

  console.log('Sending request to Cloudflare with headers:', headers)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
  })

  const destination = response.headers.get('Location')

  if (!destination) {
    const errorText = await response.text()
    console.error('Cloudflare Error:', errorText)
    return c.json({ error: 'Failed to create direct upload', details: errorText }, 500)
  }

  const mediaId = response.headers.get('stream-media-id')

  return c.json({
    uploadUrl: destination,
    streamMediaId: mediaId,
  }, 200)
})

const volcengineWebhookHandler = factory.createHandlers(async (c) => {
  try {
    const data = await c.req.json()
    if (data?.EventType === 'WorkflowComplete' && data?.Data?.Vid) {
      const vid = data.Data.Vid
      
      const playInfo = await getPlayInfo(
        vid,
        c.env.VOLC_ACCESS_KEY_ID as string,
        c.env.VOLC_SECRET_ACCESS_KEY as string
      )
      
      if (playInfo) {
        const db = drizzle(c.env.DB)
        await db.update(replayVideos).set({ transcodeStatus: playInfo }).where(eq(replayVideos.vid, vid)).execute()
      }
    }
    
    return c.json({ message: 'ok' })
  } catch (err) {
    console.error('Webhook error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

const routes = router
  .post('/', ...createVideoHandler)
  .post('/cloudflare-direct-upload', ...getCloudflareDirectUploadUrlHandler)
  .post('/volcengine-webhook', ...volcengineWebhookHandler)
  .get('/highlights/global', ...getGlobalHighlightsHandler)
  .get('/', ...getVideosHandler)
  .put('/:id/sync', ...syncVideoHandler)
  .put('/:id', ...updateVideoHandler)
  .post('/:id/highlights', ...createHighlightHandler)
  .post('/highlights/:highlightId/comments', ...createCommentHandler)
  .delete('/:id', ...deleteVideoHandler)
  .delete('/highlights/:id', ...deleteHighlightHandler)
  .put('/highlights/:id', ...updateHighlightHandler)
  .delete('/comments/:id', ...deleteCommentHandler)
  .put('/comments/:id', ...updateCommentHandler)

export { routes as replayRouter }
