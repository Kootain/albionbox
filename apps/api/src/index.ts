import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { battleReimbursementsApp } from './modules/battle_reimbursements';
import { guildsApp } from './modules/guilds';
import { usersApp } from './modules/users';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://albionbox.com'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'Albion Box API' });
});

const routes = app
  .route('/api/users', usersApp)
  .route('/api/guilds', guildsApp)
  .route('/api/battle_reimbursements', battleReimbursementsApp);

export type AppType = typeof routes;

export default app;
