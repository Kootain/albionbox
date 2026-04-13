import { hc } from 'hono/client'
import type { AppType } from '@api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787';

// NOTE: TypeScript's cross-package type inference for complex Hono route schemas
// can fail in monorepo setups when compiling with the web tsconfig. The `hc` call
// itself is correctly typed at the API level; we cast here to preserve usability.
// The type is actually ReturnType<typeof hc<AppType>> at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = hc<AppType>(API_BASE, {
  headers: () => {
    const token = localStorage.getItem('albion_erp_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(input, init);
    if (!res.ok) {
      try {
        const cloned = res.clone();
        const data = await cloned.json() as {
          error?: string | { name?: string; message?: string };
          message?: string;
        };
        
        let errorMessage = 'An error occurred';
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object' && data.error.name === 'ZodError' && typeof data.error.message === 'string') {
          try {
            const parsed = JSON.parse(data.error.message);
            if (Array.isArray(parsed)) {
              errorMessage = parsed.map((err: { message: string }) => err.message).join('; ');
            }
          } catch {
            errorMessage = data.error.message;
          }
        } else if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
          errorMessage = data.error.message;
        } else if (typeof data.message === 'string') {
          errorMessage = data.message;
        }
        
        // Return a modified response with the normalized error
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers
        });
      } catch (e) {
        // Fallback to original response if parsing fails
        return res;
      }
    }
    return res;
  }
});
