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
import { runRegearApplyAutoBinder } from './modules/cron_regear_apply_binder'

const app = new Hono<{ Bindings: Env }>()

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

export type AppType = typeof routes

export const fetch = app.fetch

export const scheduled = (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
  ctx.waitUntil(runRegearApplyAutoBinder(env).catch(() => undefined))
}

export default { fetch, scheduled }
