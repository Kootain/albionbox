import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { ApproveGuildSchema, RejectGuildSchema, ApproveBindingSchema, RejectBindingSchema } from '@albionbox/shared'
import { guilds, gameAccounts, bindingTokens, users } from '@albionbox/db'
import { authMiddleware } from '../users'
import { platformPermMiddleware } from '../permissions'
import type { AppContext } from '../../context'

const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()
const listGuildReviewsHandler = factory.createHandlers(async (c) => {
      const db = drizzle(c.env.DB)
      const result = await db.select().from(guilds).where(eq(guilds.status, 'pending')).all()
      return c.json(result)
    });
    
const approveGuildHandler = factory.createHandlers(zValidator('json', ApproveGuildSchema), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const { albionGuildId } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const guild = await db.select().from(guilds).where(eq(guilds.id, guildId)).get()
      if (!guild) return c.json({ error: 'admin.errors.guild_not_found' }, 404)
      if (guild.status !== 'pending') return c.json({ error: 'admin.errors.guild_not_pending' }, 400)

      await db.update(guilds)
        .set({ status: 'active', albionGuildId })
        .where(eq(guilds.id, guildId))
        .execute()

      return c.json({ message: 'admin.success.guild_approved' })
    });
const rejectGuildHandler = factory.createHandlers(zValidator('json', RejectGuildSchema), async (c) => {
      const { id: guildId } = c.req.param() as Record<string, string>
      const { note } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const guild = await db.select().from(guilds).where(eq(guilds.id, guildId)).get()
      if (!guild) return c.json({ error: 'admin.errors.guild_not_found' }, 404)
      if (guild.status !== 'pending') return c.json({ error: 'admin.errors.guild_not_pending' }, 400)

      await db.update(guilds).set({ status: 'rejected', reviewNote: note ?? null }).where(eq(guilds.id, guildId)).execute()
      return c.json({ message: 'admin.success.guild_rejected' })
    });

const listBindingReviewsHandler = factory.createHandlers(async (c) => {
      const db = drizzle(c.env.DB)
      const result = await db.select({
        id: bindingTokens.id,
        userId: bindingTokens.userId,
        username: bindingTokens.username,
        server: bindingTokens.server,
        token: bindingTokens.token,
        expiresAt: bindingTokens.expiresAt,
        usedAt: bindingTokens.usedAt,
        status: bindingTokens.status,
        reviewNote: bindingTokens.reviewNote,
        email: users.email
      }).from(bindingTokens)
      .leftJoin(users, eq(bindingTokens.userId, users.id))
      .where(eq(bindingTokens.status, 'pending')).all()
      return c.json(result)
    });

const approveBindingHandler = factory.createHandlers(zValidator('param', ApproveBindingSchema.pick({id: true})), zValidator('json', ApproveBindingSchema.omit({id: true})), async (c) => {
      const { id: bindingId } = c.req.param() as Record<string, string>
      const { albionPlayerId } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const binding = await db.select().from(bindingTokens).where(eq(bindingTokens.id, bindingId)).get()
      if (!binding) return c.json({ error: 'admin.errors.binding_not_found' }, 404)
        
      if (binding.status !== 'pending') return c.json({ error: 'admin.errors.binding_not_pending' }, 400)

      let account = await db.select().from(gameAccounts).where(and(eq(gameAccounts.username, binding.username), eq(gameAccounts.server, binding.server))).get()
      if (!account) {
        await db.insert(gameAccounts).values({
          id: crypto.randomUUID(),
          username: binding.username,
          server: binding.server,
          albionPlayerId,
          status: 'verified',
          userId: binding.userId,
          createdAt: new Date().toISOString(),
        })
      } else {
        await db.update(gameAccounts).set({ albionPlayerId, status: 'verified', userId: binding.userId }).where(eq(gameAccounts.id, account.id)).execute()
      }

      await db.update(bindingTokens).set({ status: 'accepted' }).where(eq(bindingTokens.id, bindingId)).execute()

      return c.json({ message: 'admin.success.binding_approved' })
    });

const rejectBindingHandler = factory.createHandlers(zValidator('json', RejectBindingSchema), async (c) => {
      const { id: bindingId } = c.req.param() as Record<string, string>
      const { note } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const binding = await db.select().from(bindingTokens).where(eq(bindingTokens.id, bindingId)).get()
      if (!binding) return c.json({ error: 'admin.errors.binding_not_found' }, 404)
      if (binding.status !== 'pending') return c.json({ error: 'admin.errors.binding_not_pending' }, 400)

      await db.update(bindingTokens).set({ status: 'rejected', reviewNote: note ?? null }).where(eq(bindingTokens.id, bindingId)).execute()
      return c.json({ message: 'admin.success.binding_rejected' })
    });


const routes = router
      .use('*', authMiddleware)
      .use('*', platformPermMiddleware('platform:admin'))
      .get('/guild_reviews', ...listGuildReviewsHandler)
      .post('/guild_reviews/:id/approve', ...approveGuildHandler)
      .post('/guild_reviews/:id/reject', ...rejectGuildHandler)
      .get('/binding_reviews', ...listBindingReviewsHandler)
      .post('/binding_reviews/:id/approve', ...approveBindingHandler)
      .post('/binding_reviews/:id/reject', ...rejectBindingHandler);

export { routes as adminReviewsRouter }
