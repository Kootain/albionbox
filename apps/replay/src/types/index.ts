export type Role = 'DPS' | 'Tank' | 'Healer' | 'Support';

export interface Comment {
  id: string;
  content: string;
  username: string;
  createdAt: number | string;
}

export interface Highlight {
  id: string;
  videoId?: string;
  timestamp: number; // in seconds
  absoluteTime?: number; // matching CreateReplayHighlightSchema
  comments: Comment[];
  isGlobal?: boolean;
  username?: string;
}

export interface VideoRecord {
  id: string;
  vid?: string;
  title?: string;
  username: string;
  role: Role;
  date: string; // YYYY-MM-DD format
  filename?: string;
  blobId?: string; // Used to fetch from idb (or can we remove this?)
  videoUrl?: string; // Optional: Remote URL if no local blob exists
  transcodeStatus?: Record<string, string>;
  createdAt: number;
  duration?: number;
  highlights: Highlight[];
  absoluteStartTime?: number; // Added for multi-POV sync
}