import { Hono } from 'hono'
import { usersRouter } from './modules/users'
import { permissionsRouter, seedPermissions } from './modules/permissions'

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

export type AppType = typeof routes

export default app
