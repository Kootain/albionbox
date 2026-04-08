import { Hono } from 'hono'
import { usersRouter } from './modules/users'
import { permissionsRouter, seedPermissions } from './modules/permissions'
import { gameAccountsRouter } from './modules/game_accounts'
import { guildsRouter, guildRolesRouter, guildMembersRouter } from './modules/guilds'
import { adminReviewsRouter } from './modules/admin'
import { battleRecordsRouter } from './modules/battle_records'

const app = new Hono<{ Bindings: Env }>()

let seeded = false

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
  .route('/guilds', battleRecordsRouter)

export type AppType = typeof routes

export default app
