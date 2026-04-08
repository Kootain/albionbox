import type { ApiError } from '../types/domain';
import { sessionStore } from './session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8787';

const buildUrl = (path: string, query?: Record<string, string | number | boolean | undefined>) => {
  const basePath = path.startsWith('/api') ? path : `/api${path}`;
  const url = new URL(`${API_BASE_URL}${basePath}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  if (!API_BASE_URL) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return url.toString();
};

async function request<T>(path: string, init?: RequestInit, query?: Record<string, string | number | boolean | undefined>) {
  const token = sessionStore.get();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers,
  });

  const rawText = await response.text();
  const data = rawText ? (JSON.parse(rawText) as T | ApiError) : null;

  if (!response.ok) {
    const errorMessage = typeof data === 'object' && data && 'error' in data ? data.error : '请求失败';
    throw new Error(errorMessage);
  }

  return data as T;
}

export const apiClient = {
  get<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
    return request<T>(path, { method: 'GET' }, query);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};
