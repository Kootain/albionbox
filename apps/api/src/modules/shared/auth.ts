import type { MiddlewareHandler } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '@albionbox/db/src/schema/users';
import { getAuthorizationToken } from './utils';

export type SessionPayload = {
  userId: string;
  createdAt: string;
};

const sessionTtlSeconds = 60 * 60 * 24 * 30;

export const getSessionKey = (token: string) => `session:${token}`;
export const createSessionToken = () => `session_${crypto.randomUUID()}${crypto.randomUUID()}`;

export const issueSession = async (kv: KVNamespace, userId: string) => {
  const sessionToken = createSessionToken();
  const sessionPayload: SessionPayload = {
    userId,
    createdAt: new Date().toISOString(),
  };

  await kv.put(getSessionKey(sessionToken), JSON.stringify(sessionPayload), {
    expirationTtl: sessionTtlSeconds,
  });

  return sessionToken;
};

export const resolveSession = async (kv: KVNamespace, request: Request) => {
  const sessionToken = getAuthorizationToken(request);

  if (!sessionToken) {
    return {
      state: 'missing' as const,
    };
  }

  const sessionPayload = await kv.get<SessionPayload>(getSessionKey(sessionToken), 'json');

  if (!sessionPayload?.userId) {
    return {
      state: 'invalid' as const,
    };
  }

  return {
    state: 'valid' as const,
    userId: sessionPayload.userId,
    sessionToken,
  };
};

export const requireAuth: MiddlewareHandler<any> = async (c, next) => {
  const session = await resolveSession(c.env.KV, c.req.raw);

  if (session.state === 'missing') {
    return c.json({ error: '请先登录' }, 401);
  }

  if (session.state === 'invalid') {
    return c.json({ error: '登录状态已失效，请重新登录' }, 401);
  }

  c.set('userId', session.userId);
  c.set('sessionToken', session.sessionToken);
  await next();
};

export const requireAdmin = (message = '仅管理员可执行该操作'): MiddlewareHandler<any> => async (c, next) => {
  const session = await resolveSession(c.env.KV, c.req.raw);

  if (session.state === 'missing') {
    return c.json({ error: '请先登录' }, 401);
  }

  if (session.state === 'invalid') {
    return c.json({ error: '登录状态已失效，请重新登录' }, 401);
  }

  const db = drizzle(c.env.DB);
  const userRecord = await db.select().from(users).where(eq(users.id, session.userId)).get();

  if (!userRecord?.isAdmin) {
    return c.json({ error: message }, 403);
  }

  c.set('userId', session.userId);
  c.set('sessionToken', session.sessionToken);
  await next();
};
