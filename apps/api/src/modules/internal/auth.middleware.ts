import type { MiddlewareHandler } from 'hono'
import type { AppContext } from '../../context'

export const internalAuthMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  if (token !== c.env.INTERNAL_API_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}
