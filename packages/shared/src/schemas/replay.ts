import { z } from 'zod'

export const CreateReplayVideoSchema = z.object({
  vid: z.string().min(1, 'Video ID is required'),
  title: z.string().optional(),
  duration: z.number().int().optional(),
  username: z.string().min(1, 'Username is required'),
  date: z.string().min(1, 'Date is required'),
  role: z.string().min(1, 'Role is required'),
  absoluteStartTime: z.number().int().optional(), // MS timestamp
})
export type CreateReplayVideo = z.infer<typeof CreateReplayVideoSchema>

export const CreateReplayHighlightSchema = z.object({
  timestamp: z.number().int().min(0, 'Timestamp must be a positive number'),
  absoluteTime: z.number().int().optional(), // MS timestamp
})
export type CreateReplayHighlight = z.infer<typeof CreateReplayHighlightSchema>

export const CreateReplayCommentSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  content: z.string().min(1, 'Content cannot be empty'),
})
export type CreateReplayComment = z.infer<typeof CreateReplayCommentSchema>

export const UpdateReplayCommentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
})
export type UpdateReplayComment = z.infer<typeof UpdateReplayCommentSchema>

export const UpdateReplayHighlightSchema = z.object({
  timestamp: z.number().int().min(0, 'Timestamp must be a positive number').optional(),
  absoluteTime: z.number().int().optional(),
})
export type UpdateReplayHighlight = z.infer<typeof UpdateReplayHighlightSchema>

export const UpdateReplayVideoSchema = z.object({
  title: z.string().optional(),
  role: z.string().min(1, 'Role is required').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
})
export type UpdateReplayVideo = z.infer<typeof UpdateReplayVideoSchema>

export const SyncReplayVideoSchema = z.object({
  absoluteStartTime: z.number().int(), // MS timestamp
})
export type SyncReplayVideo = z.infer<typeof SyncReplayVideoSchema>
