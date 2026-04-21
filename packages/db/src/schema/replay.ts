import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const replayVideos = sqliteTable('replay_videos', {
  id: text('id').primaryKey(),
  vid: text('vid').notNull(),
  duration: integer('duration'),
  username: text('username').notNull(),
  date: text('date').notNull(),
  role: text('role').notNull(),
  absoluteStartTime: integer('absolute_start_time'), // Absolute time of the video start (ms timestamp)
  transcodeStatus: text('transcode_status', { mode: 'json' }).$type<Record<string, string>>(),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('replay_videos_username_idx').on(table.username),
  index('replay_videos_date_idx').on(table.date),
]))

export const replayHighlights = sqliteTable('replay_highlights', {
  id: text('id').primaryKey(),
  videoId: text('video_id').notNull().references(() => replayVideos.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp').notNull(), // Relative time in seconds or ms
  absoluteTime: integer('absolute_time'), // Absolute time
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('replay_highlights_video_id_idx').on(table.videoId),
]))

export const replayComments = sqliteTable('replay_comments', {
  id: text('id').primaryKey(),
  highlightId: text('highlight_id').notNull().references(() => replayHighlights.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ([
  index('replay_comments_highlight_id_idx').on(table.highlightId),
]))
