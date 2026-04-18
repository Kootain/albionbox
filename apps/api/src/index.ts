import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { usersRouter } from './modules/users'
import { permissionsRouter, seedPermissions } from './modules/permissions'
import { gameAccountsRouter } from './modules/game_accounts'
import { guildsRouter, guildRolesRouter, guildMembersRouter, guildSettingsRouter } from './modules/guilds'
import { adminReviewsRouter } from './modules/admin'
import { battleRecordsRouter } from './modules/battle_records'
import { regearRouter } from './modules/regear'
import { regearApplyRouter } from './modules/regear_apply/router'
import { kookRouter } from './modules/kook'
import { runRegearApplyAutoBinder } from './modules/cron/cron_regear_apply_binder'
import { internalAuthMiddleware } from './modules/internal/auth.middleware'
import type { AppContext } from './context'

const app = new Hono<AppContext>()

let seeded = false

function getAllowedOrigins(value: string | undefined) {
  const origins = new Set<string>()
  const items = (value ?? '')
    .split(/[,\s]+/g)
    .map(s => s.trim())
    .filter(Boolean)

  for (const item of items) {
    origins.add(item)
    try {
      const url = new URL(item)

      if (url.hostname === 'localhost') {
        origins.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`)
      }

      if (url.hostname === '127.0.0.1') {
        origins.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`)
      }
    } catch {
      // ignore
    }
  }

  return origins
}

app.use('*', async (c, next) => {
  const allowedOrigins = getAllowedOrigins(c.env.WEB_ORIGIN ?? c.env.APP_BASE_URL)

  return cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.has(origin)) {
        return origin
      }

      return ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  })(c, next)
})

app.use('*', async (c, next) => {
  if (!seeded) {
    await seedPermissions(c.env.DB)
    seeded = true
  }
  await next()
})

const routes = app
  .route('/users', usersRouter)
  .route('/admin', permissionsRouter)
  .route('/admin', adminReviewsRouter)
  .route('/game_accounts', gameAccountsRouter)
  .route('/guilds', guildsRouter)
  .route('/guilds', guildRolesRouter)
  .route('/guilds', guildMembersRouter)
  .route('/guilds', guildSettingsRouter)
  .route('/guilds', battleRecordsRouter)
  .route('/guilds', regearRouter)
  .route('/regear_applies', regearApplyRouter)
  .route('/kook', kookRouter)
  .get('/__scheduled', async (c) => {
    const startedAt = Date.now()
    try {
      const result = await runRegearApplyAutoBinder(c.env, true)
      return c.json({
        ok: true,
        durationMs: Date.now() - startedAt,
        result,
      })
    } catch (e) {
      const err = e as any
      return c.json({
        ok: false,
        durationMs: Date.now() - startedAt,
        error: { name: err?.name, message: err?.message ?? String(e) },
      }, 500)
    }
  })

export type AppType = typeof routes

export const fetch = app.fetch

export const scheduled = (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
  ctx.waitUntil((async () => {
    const startedAt = Date.now()
    console.log(JSON.stringify({
      msg: 'scheduled_start',
      name: 'regear_apply_binder',
      cron: event.cron,
      scheduledTime: event.scheduledTime,
    }))
    try {
      const result = await runRegearApplyAutoBinder(env)
      console.log(JSON.stringify({
        msg: 'scheduled_done',
        name: 'regear_apply_binder',
        cron: event.cron,
        scheduledTime: event.scheduledTime,
        durationMs: Date.now() - startedAt,
        result,
      }))
    } catch (e) {
      const err = e as any
      console.error(JSON.stringify({
        msg: 'scheduled_error',
        name: 'regear_apply_binder',
        cron: event.cron,
        scheduledTime: event.scheduledTime,
        durationMs: Date.now() - startedAt,
        error: { name: err?.name, message: err?.message ?? String(e) },
      }))
    }
  })())
}

export default { fetch, scheduled }
