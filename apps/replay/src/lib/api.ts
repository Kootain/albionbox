import { hc } from 'hono/client';
import type { AppType } from '@api';
import { VideoRecord, Highlight, Comment } from '../types';
import type { CreateReplayVideo, CreateReplayHighlight, CreateReplayComment, SyncReplayVideo, UpdateReplayHighlight, UpdateReplayComment } from '../../../../packages/shared/src/schemas/replay';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// @ts-ignore - Ignore deep instantiation error for now
const client = hc<AppType>(API_BASE_URL, {
  headers: () => {
    const token = localStorage.getItem('albion_erp_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
});

export async function fetchVideos(): Promise<VideoRecord[]> {
  const res = await client.replay.$get({ query: {} });
  if (!res.ok) throw new Error('Failed to fetch videos');
  const data = await res.json();
  return data.data as unknown as VideoRecord[];
}

export async function createVideo(payload: CreateReplayVideo): Promise<VideoRecord> {
  const res = await client.replay.$post({ json: payload });
  if (!res.ok) throw new Error('Failed to create video');
  // API only returns { id, message }, but we might need the full record
  // Assuming callers might just refresh the list.
  return { ...payload, id: 'temp', createdAt: new Date().toISOString(), highlights: [] } as unknown as VideoRecord;
}

export async function getGlobalHighlights(startTime: number, endTime: number): Promise<Highlight[]> {
  const res = await client.replay.highlights.global.$get({ query: { startTime: startTime.toString(), endTime: endTime.toString() } });
  if (!res.ok) throw new Error('Failed to fetch global highlights');
  const data = await res.json();
  return data.data as unknown as Highlight[];
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await client.replay[':id'].$delete({ param: { id } });
  if (!res.ok) throw new Error('Failed to delete video');
}

export async function syncVideoTime(id: string, payload: SyncReplayVideo): Promise<VideoRecord> {
  const res = await client.replay[':id'].sync.$put({ param: { id }, json: payload });
  if (!res.ok) throw new Error('Failed to sync video time');
  // Just returning a dummy object because the actual app just updates the absoluteStartTime locally
  return { absoluteStartTime: payload.absoluteStartTime } as unknown as VideoRecord;
}

export async function updateVideo(id: string, data: { role?: string; date?: string }) {
  const res = await client.replay[':id'].$put({
    param: { id },
    json: data,
  });
  if (!res.ok) throw new Error('Failed to update video');
  return res.json();
}

export async function createHighlight(videoId: string, payload: CreateReplayHighlight): Promise<Highlight> {
  const res = await client.replay[':id'].highlights.$post({ param: { id: videoId }, json: payload });
  if (!res.ok) throw new Error('Failed to create highlight');
  const data = await res.json();
  return { ...payload, id: data.id, videoId, comments: [], createdAt: new Date().toISOString() } as unknown as Highlight;
}

export async function createComment(videoId: string, highlightId: string, payload: CreateReplayComment): Promise<Comment> {
  const res = await client.replay.highlights[':highlightId'].comments.$post({ param: { highlightId }, json: payload });
  if (!res.ok) throw new Error('Failed to create comment');
  const data = await res.json();
  return { ...payload, id: data.id, highlightId, createdAt: new Date().toISOString() } as unknown as Comment;
}

export async function searchPlayer(query: string, server: 'asia' | 'us' | 'eu' = 'asia'): Promise<any> {
  const res = await client.guilds.test.albion.search.$get({ query: { q: query, server } });
  if (!res.ok) throw new Error('Failed to search player');
  return res.json();
}

export async function deleteHighlight(id: string): Promise<void> {
  const res = await client.replay.highlights[':id'].$delete({ param: { id } });
  if (!res.ok) throw new Error('Failed to delete highlight');
}

export async function updateHighlight(id: string, payload: UpdateReplayHighlight): Promise<void> {
  const res = await client.replay.highlights[':id'].$put({ param: { id }, json: payload });
  if (!res.ok) throw new Error('Failed to update highlight');
}

export async function deleteComment(id: string): Promise<void> {
  const res = await client.replay.comments[':id'].$delete({ param: { id } });
  if (!res.ok) throw new Error('Failed to delete comment');
}

export async function updateComment(id: string, payload: UpdateReplayComment): Promise<void> {
  const res = await client.replay.comments[':id'].$put({ param: { id }, json: payload });
  if (!res.ok) throw new Error('Failed to update comment');
}
