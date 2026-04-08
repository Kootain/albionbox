import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { jwt, sign } from 'hono/jwt';
import { cors } from 'hono/cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'albion-erp-secret-key-2026';

interface JWTPayload {
  uid: string;
  email: string;
  role: string;
}

export const app = new Hono<{ Variables: { jwtPayload: JWTPayload } }>();

app.use('*', cors());

// Mock Database (In-memory for this migration example)
const db = {
  users: new Map<string, any>(),
  guilds: new Map<string, any>(),
  regearSessions: new Map<string, any>(),
  regearRequests: new Map<string, any>(),
};

// Initial Admin User for testing
db.users.set('admin-uid', {
  uid: 'admin-uid',
  email: 'kootain.gao@gmail.com',
  role: 'admin',
  gameAccounts: [],
  createdAt: new Date().toISOString(),
});

const authMiddleware = jwt({
  secret: JWT_SECRET,
  alg: 'HS256',
});

const api = app.basePath('/api');

// Auth Routes
api.post('/auth/register', async (c) => {
  const { email, password } = await c.req.json();
  if (Array.from(db.users.values()).find(u => u.email === email)) {
    return c.json({ error: 'User already exists' }, 400);
  }
  const uid = Math.random().toString(36).substring(7);
  const user = {
    uid,
    email,
    role: email === 'kootain.gao@gmail.com' ? 'admin' : 'user',
    gameAccounts: [],
    createdAt: new Date().toISOString(),
  };
  db.users.set(uid, user);
  const token = await sign({ uid, email, role: user.role }, JWT_SECRET);
  return c.json({ token, user });
});

api.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const user = Array.from(db.users.values()).find(u => u.email === email);
  if (!user) return c.json({ error: 'User not found' }, 404);
  
  const token = await sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET);
  return c.json({ token, user });
});

api.get('/auth/me', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const user = db.users.get(payload.uid);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user });
});

// User Profile Routes
api.get('/users/:uid', authMiddleware, async (c) => {
  const uid = c.req.param('uid');
  const user = db.users.get(uid);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

api.patch('/users/:uid', authMiddleware, async (c) => {
  const uid = c.req.param('uid');
  const payload = c.get('jwtPayload');
  if (payload.uid !== uid && payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
  
  const updates = await c.req.json();
  const user = db.users.get(uid);
  const updatedUser = { ...user, ...updates };
  db.users.set(uid, updatedUser);
  return c.json(updatedUser);
});

// Guild Routes
api.get('/guilds', authMiddleware, async (c) => {
  return c.json(Array.from(db.guilds.values()));
});

api.post('/guilds', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const data = await c.req.json();
  const guildId = Math.random().toString(36).substring(7);
  const guild = {
    ...data,
    id: guildId,
    adminUid: payload.uid,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.guilds.set(guildId, guild);
  return c.json(guild);
});

api.patch('/guilds/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const payload = c.get('jwtPayload');
  const guild = db.guilds.get(id);
  if (!guild) return c.json({ error: 'Guild not found' }, 404);
  if (guild.adminUid !== payload.uid && payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
  
  const updates = await c.req.json();
  const updatedGuild = { ...guild, ...updates };
  db.guilds.set(id, updatedGuild);
  return c.json(updatedGuild);
});

// Admin Routes
api.get('/admin/pending-guilds', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
  const pending = Array.from(db.guilds.values()).filter(g => g.status === 'pending');
  return c.json(pending);
});

api.get('/admin/pending-bindings', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  if (payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403);
  
  const pending: any[] = [];
  db.users.forEach(user => {
    user.gameAccounts?.forEach((acc: any) => {
      if (acc.status === 'pending') {
        pending.push({ ...acc, uid: user.uid, email: user.email });
      }
    });
  });
  return c.json(pending);
});

// Regear Routes
api.get('/regear/sessions', authMiddleware, async (c) => {
  return c.json(Array.from(db.regearSessions.values()));
});

api.post('/regear/sessions', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const data = await c.req.json();
  const id = Math.random().toString(36).substring(7);
  const session = {
    ...data,
    id,
    createdBy: payload.uid,
    createdAt: new Date().toISOString(),
  };
  db.regearSessions.set(id, session);
  return c.json(session);
});

// Vite Integration
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  app.all('*', async (c) => {
    // @ts-ignore
    const req = c.env.incoming;
    // @ts-ignore
    const res = c.env.outgoing;
    
    await new Promise((resolve) => {
      vite.middlewares(req, res, () => {
        resolve(null);
      });
    });
    
    return c.notFound();
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.get('*', async (c) => {
    const filePath = path.join(distPath, c.req.path === '/' ? 'index.html' : c.req.path);
    if (fs.existsSync(filePath)) {
      return c.body(fs.readFileSync(filePath));
    }
    return c.body(fs.readFileSync(path.join(distPath, 'index.html')));
  });
}

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});

export type AppType = typeof app;
