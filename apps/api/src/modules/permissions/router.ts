import { Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { SetupAdminSchema } from '@albionbox/shared'
import { roles, userPlatformRoles, users } from '@albionbox/db'

const factory = createFactory<{ Bindings: Env }>();
const router = new Hono<{ Bindings: Env }>()
const setupAdminHandler = factory.createHandlers(zValidator('json', SetupAdminSchema), async (c) => {
      const { userId } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const adminRole = await db.select().from(roles).where(eq(roles.name, 'platform_admin')).get()
      if (!adminRole) return c.json({ error: 'Platform admin role not seeded yet' }, 500)

      const existingAdmin = await db
        .select()
        .from(userPlatformRoles)
        .where(eq(userPlatformRoles.roleId, adminRole.id))
        .get()

      if (existingAdmin) return c.json({ error: '已存在平台管理员，无法重复初始化' }, 409)

      const targetUser = await db.select().from(users).where(eq(users.id, userId)).get()
      if (!targetUser) return c.json({ error: '用户不存在' }, 404)

      await db.insert(userPlatformRoles).values({ userId, roleId: adminRole.id }).execute()

      return c.json({ message: '平台管理员初始化成功' })
    });


const routes = router
      .post('/setup', ...setupAdminHandler);

export { routes as permissionsRouter }
