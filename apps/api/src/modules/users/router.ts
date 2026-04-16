import { Context, Hono } from 'hono'
import { createFactory } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, sql } from 'drizzle-orm'
import {
  RegisterUserSchema,
  LoginUserSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SwitchActiveGameAccountSchema,
  OAuthCallbackSchema,
  UnbindThirdPartySchema,
} from '@albionbox/shared'
import { users, emailVerifications, passwordResetTokens, gameAccounts, thirdPartyAccounts } from '@albionbox/db'
import { hashPassword, generateSalt, sendVerificationEmail, sendPasswordResetEmail } from './email.service'
import { authMiddleware } from './auth.middleware'
import type { AppContext } from '../../context'
import { KookOAuthProvider } from './oauth.service'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
const factory = createFactory<AppContext>();
const router = new Hono<AppContext>()

async function expireRegisterAccount(c: Context, user: typeof users.$inferSelect) {
  const db = drizzle(c.env.DB)
  const record = await db.select().from(emailVerifications).where(eq(emailVerifications.userId, user.id)).get()
  if (!record) return false
  if (new Date(record.expiresAt) < new Date()) {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, record.id)).execute()
    await db.delete(users).where(eq(users.id, user.id)).execute()
    return true
  } else {
    return false
  }
}

const registerHandler = factory.createHandlers(zValidator('json', RegisterUserSchema), async (c) => {
      const { email, password } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const existing = await db.select().from(users).where(eq(users.email, email)).get()
      
      if (existing) {
        if (!existing.emailVerified) {
          if (!await expireRegisterAccount(c, existing)) {
            return c.json({ error: '邮箱已注册' }, 409)
          }
        }
      }

      const salt = generateSalt()
      const hash = await hashPassword(password, salt)
      const userId = crypto.randomUUID()
      const now = new Date().toISOString()

      await db.insert(users).values({
        id: userId,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        sessionsVersion: 0,
        createdAt: now,
      }).execute()

      const verifyToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
      await db.insert(emailVerifications).values({
        id: crypto.randomUUID(),
        userId,
        token: verifyToken,
        expiresAt,
      }).execute()

      await sendVerificationEmail(
        c.env.RESEND_API_KEY,
        c.env.API_BASE_URL ?? c.env.APP_BASE_URL,
        email,
        verifyToken
      )

      return c.json({ message: '注册成功，请查收激活邮件' }, 201)
    });

const verifyEmailHandler = factory.createHandlers(async (c) => {
      const token = c.req.query('token')
      if (!token) return c.json({ error: '缺少 token' }, 400)

      const db = drizzle(c.env.DB)
      const record = await db.select().from(emailVerifications).where(eq(emailVerifications.token, token)).get()

      if (!record) return c.json({ error: '无效的验证链接' }, 400)
      if (record.verifiedAt) return c.json({ message: '邮箱已激活' })
      if (new Date(record.expiresAt) < new Date()) return c.json({ error: '验证链接已过期' }, 400)

      await Promise.all([
        db.update(emailVerifications)
          .set({ verifiedAt: new Date().toISOString() })
          .where(eq(emailVerifications.id, record.id))
          .execute(),
        db.update(users)
          .set({ emailVerified: true })
          .where(eq(users.id, record.userId))
          .execute()
      ])

      return c.json({ message: '邮箱激活成功' })
    });

const loginHandler = factory.createHandlers(zValidator('json', LoginUserSchema), async (c) => {
      const { email, password } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const user = await db.select().from(users).where(eq(users.email, email)).get()
      if (!user) return c.json({ error: '邮箱或密码错误' }, 401)

      if (!user.emailVerified) {
        if (await expireRegisterAccount(c, user)) {
          return c.json({ error: '邮箱已过期，请重新注册' }, 409)
        } else {
          return c.json({ error: '邮箱未激活，请先验证邮箱' }, 403)
        }
      }

      if (!user.passwordSalt || !user.passwordHash) {
        return c.json({ error: '该账号未设置密码，请使用第三方登录' }, 401)
      }
      const hash = await hashPassword(password, user.passwordSalt)
      if (hash !== user.passwordHash) return c.json({ error: '邮箱或密码错误' }, 401)

      const token = crypto.randomUUID()
      const session = JSON.stringify({ userId: user.id, sessionsVersion: user.sessionsVersion })
      await c.env.KV.put(token, session, { expirationTtl: SESSION_TTL_SECONDS })

      return c.json({ token })
    });

const logoutHandler = factory.createHandlers(authMiddleware, async (c) => {
      const token = c.get('token')
      await c.env.KV.delete(token)
      return c.json({ message: '已退出登录' })
    });

const getMeHandler = factory.createHandlers(authMiddleware, async (c) => {
      const user = c.get('user')
      const db = drizzle(c.env.DB)
      
      const tpa = await db.select().from(thirdPartyAccounts).where(eq(thirdPartyAccounts.userId, user.id)).all()
      
      return c.json({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        activeGameAccountId: user.activeGameAccountId,
        thirdPartyAccounts: tpa.map(a => ({
          provider: a.provider,
          providerUsername: a.providerUsername,
          providerAvatar: a.providerAvatar,
        }))
      })
    });

const switchActiveGameAccountHandler = factory.createHandlers(authMiddleware, zValidator('json', SwitchActiveGameAccountSchema), async (c) => {
      const user = c.get('user')
      const { gameAccountId } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const account = await db.select().from(gameAccounts)
        .where(and(eq(gameAccounts.id, gameAccountId), eq(gameAccounts.userId, user.id), eq(gameAccounts.status, 'verified')))
        .get()

      if (!account) return c.json({ error: '游戏账号不存在或未激活' }, 404)

      await db.update(users).set({ activeGameAccountId: gameAccountId }).where(eq(users.id, user.id)).execute()

      return c.json({ message: '游戏角色切换成功' })
    });

const forgotPasswordHandler = factory.createHandlers(zValidator('json', ForgotPasswordSchema), async (c) => {
      const { email } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const user = await db.select().from(users).where(eq(users.email, email)).get()
      if (user) {
        const token = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        await db.insert(passwordResetTokens).values({
          id: crypto.randomUUID(),
          userId: user.id,
          token,
          expiresAt,
        }).execute()

        try {
          await sendPasswordResetEmail(
            c.env.RESEND_API_KEY,
            c.env.API_BASE_URL ?? c.env.APP_BASE_URL,
            email,
            token
          )
        } catch {
          // Non-fatal
        }
      }

      return c.json({ message: '如果该邮箱存在，重置邮件已发送' })
    });
const resetPasswordHandler = factory.createHandlers(zValidator('json', ResetPasswordSchema), async (c) => {
      const { token, newPassword } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const record = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).get()
      if (!record) return c.json({ error: '无效的重置链接' }, 400)
      if (record.usedAt) return c.json({ error: '重置链接已使用' }, 400)
      if (new Date(record.expiresAt) < new Date()) return c.json({ error: '重置链接已过期' }, 400)

      const user = await db.select().from(users).where(eq(users.id, record.userId)).get()
      if (!user) return c.json({ error: '用户不存在' }, 404)

      const salt = generateSalt()
      const hash = await hashPassword(newPassword, salt)

      await Promise.all([
        db.update(passwordResetTokens)
          .set({ usedAt: new Date().toISOString() })
          .where(eq(passwordResetTokens.id, record.id))
          .execute(),
        db.update(users)
          .set({
            passwordHash: hash,
            passwordSalt: salt,
            sessionsVersion: sql`${users.sessionsVersion} + 1`,
          })
          .where(eq(users.id, user.id))
          .execute(),
      ])

      return c.json({ message: '密码重置成功' })
    });


const oauthKookLoginHandler = factory.createHandlers(zValidator('json', OAuthCallbackSchema), async (c) => {
      const { code, redirectUri } = c.req.valid('json')
      const db = drizzle(c.env.DB)
      const provider = new KookOAuthProvider(c.env.KOOK_CLIENT_ID, c.env.KOOK_CLIENT_SECRET)

      let token, userInfo
      try {
        token = await provider.getAccessToken(code, redirectUri)
        userInfo = await provider.getUserInfo(token)
      } catch (e: any) {
        return c.json({ error: '获取第三方授权失败' }, 400)
      }

      const existingAccount = await db.select().from(thirdPartyAccounts)
        .where(and(eq(thirdPartyAccounts.provider, 'kook'), eq(thirdPartyAccounts.providerAccountId, userInfo.providerAccountId)))
        .get()

      let userId: string
      let sessionsVersion = 0

      if (existingAccount) {
        userId = existingAccount.userId
        await db.update(thirdPartyAccounts).set({
          providerUsername: userInfo.providerUsername,
          providerAvatar: userInfo.providerAvatar,
          accessToken: token,
          updatedAt: new Date().toISOString()
        }).where(eq(thirdPartyAccounts.id, existingAccount.id)).execute()

        const u = await db.select().from(users).where(eq(users.id, userId)).get()
        if (!u) return c.json({ error: '用户不存在' }, 404)
        sessionsVersion = u.sessionsVersion
      } else {
        userId = crypto.randomUUID()
        const now = new Date().toISOString()
        await db.insert(users).values({
          id: userId,
          email: null,
          emailVerified: true,
          passwordHash: null,
          passwordSalt: null,
          sessionsVersion: 0,
          createdAt: now,
        }).execute()

        await db.insert(thirdPartyAccounts).values({
          id: crypto.randomUUID(),
          userId,
          provider: 'kook',
          providerAccountId: userInfo.providerAccountId,
          providerUsername: userInfo.providerUsername,
          providerAvatar: userInfo.providerAvatar,
          accessToken: token,
          createdAt: now,
          updatedAt: now,
        }).execute()
      }

      const sessionToken = crypto.randomUUID()
      const session = JSON.stringify({ userId, sessionsVersion })
      await c.env.KV.put(sessionToken, session, { expirationTtl: SESSION_TTL_SECONDS })

      return c.json({ token: sessionToken })
    });

const oauthKookBindHandler = factory.createHandlers(authMiddleware, zValidator('json', OAuthCallbackSchema), async (c) => {
      const user = c.get('user')
      const { code, redirectUri } = c.req.valid('json')
      const db = drizzle(c.env.DB)
      const provider = new KookOAuthProvider(c.env.KOOK_CLIENT_ID, c.env.KOOK_CLIENT_SECRET)

      let token, userInfo
      try {
        token = await provider.getAccessToken(code, redirectUri)
        userInfo = await provider.getUserInfo(token)
      } catch (e: any) {
        return c.json({ error: '获取第三方授权失败' }, 400)
      }

      const existingProviderAccount = await db.select().from(thirdPartyAccounts)
        .where(and(eq(thirdPartyAccounts.provider, 'kook'), eq(thirdPartyAccounts.providerAccountId, userInfo.providerAccountId)))
        .get()

      if (existingProviderAccount) {
        if (existingProviderAccount.userId !== user.id) {
          return c.json({ error: '该 Kook 账号已被其他平台账号绑定' }, 409)
        } else {
          return c.json({ message: '您已绑定该 Kook 账号' })
        }
      }

      const existingUserBinding = await db.select().from(thirdPartyAccounts)
        .where(and(eq(thirdPartyAccounts.userId, user.id), eq(thirdPartyAccounts.provider, 'kook')))
        .get()

      if (existingUserBinding) {
        return c.json({ error: '您已绑定了一个 Kook 账号，无法绑定多个' }, 409)
      }

      const now = new Date().toISOString()
      await db.insert(thirdPartyAccounts).values({
        id: crypto.randomUUID(),
        userId: user.id,
        provider: 'kook',
        providerAccountId: userInfo.providerAccountId,
        providerUsername: userInfo.providerUsername,
        providerAvatar: userInfo.providerAvatar,
        accessToken: token,
        createdAt: now,
        updatedAt: now,
      }).execute()

      return c.json({ message: '绑定成功' })
    });

const oauthUnbindHandler = factory.createHandlers(authMiddleware, zValidator('json', UnbindThirdPartySchema), async (c) => {
      const user = c.get('user')
      const { provider } = c.req.valid('json')
      const db = drizzle(c.env.DB)

      const u = await db.select().from(users).where(eq(users.id, user.id)).get()
      const tpa = await db.select().from(thirdPartyAccounts).where(eq(thirdPartyAccounts.userId, user.id)).all()

      if (!u?.email && tpa.length <= 1) {
        return c.json({ error: '无法解绑，您必须保留至少一种登录方式（邮箱或其他第三方账号）' }, 400)
      }

      await db.delete(thirdPartyAccounts)
        .where(and(eq(thirdPartyAccounts.userId, user.id), eq(thirdPartyAccounts.provider, provider)))
        .execute()

      return c.json({ message: '解绑成功' })
    });

const routes = router
      .post('/register', ...registerHandler)
      .get('/verify_email', ...verifyEmailHandler)
      .post('/login', ...loginHandler)
      .post('/logout', ...logoutHandler)
      .get('/me', ...getMeHandler)
      .put('/me/active_game_account', ...switchActiveGameAccountHandler)
      .post('/forgot_password', ...forgotPasswordHandler)
      .post('/reset_password', ...resetPasswordHandler)
      .post('/oauth/kook/login', ...oauthKookLoginHandler)
      .post('/oauth/kook/bind', ...oauthKookBindHandler)
      .delete('/oauth/unbind', ...oauthUnbindHandler);

export { routes as usersRouter }
