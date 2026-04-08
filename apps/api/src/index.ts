import { Hono } from 'hono'
import { usersRouter } from './modules/users'
import { permissionsRouter, seedPermissions } from './modules/permissions'
import { gameAccountsRouter } from './modules/game_accounts'

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
  .route('/game_accounts', gameAccountsRouter)

export type AppType = typeof routes

export default app
