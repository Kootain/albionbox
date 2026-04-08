import { hc } from 'hono/client';
import type { AppType } from '@/server.ts';

const client = hc<AppType>(window.location.origin, {
  headers: () => {
    const token = localStorage.getItem('albion_erp_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const api = client.api;
