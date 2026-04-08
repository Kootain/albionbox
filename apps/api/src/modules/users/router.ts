import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import {
  RegisterUserSchema,
  LoginUserSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SwitchActiveGameAccountSchema,
} from '@albionbox/shared'
import { users, emailVerifications, passwordResetTokens, gameAccounts } from '@albionbox/db'
import { hashPassword, generateSalt, sendVerificationEmail, sendPasswordResetEmail } from './email.service'
import { authMiddleware } from './auth.middleware'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

const router = new Hono<{ Bindings: Env }>()

router.post('/register', zValidator('json', RegisterUserSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const existing = await db.select().from(users).where(eq(users.email, email)).get()
  if (existing) return c.json({ error: '邮箱已注册' }, 409)

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
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await db.insert(emailVerifications).values({
    id: crypto.randomUUID(),
    userId,
    token: verifyToken,
    expiresAt,
  }).execute()

  try {
    await sendVerificationEmail(c.env.RESEND_API_KEY, c.env.APP_BASE_URL, email, verifyToken)
  } catch {
    // Email send failure is non-fatal; user can request resend
  }

  return c.json({ message: '注册成功，请查收激活邮件' }, 201)
})

router.get('/verify_email', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.json({ error: '缺少 token' }, 400)

  const db = drizzle(c.env.DB)
  const record = await db.select().from(emailVerifications).where(eq(emailVerifications.token, token)).get()

  if (!record) return c.json({ error: '无效的验证链接' }, 400)
  if (record.verifiedAt) return c.json({ message: '邮箱已激活' })
  if (new Date(record.expiresAt) < new Date()) return c.json({ error: '验证链接已过期' }, 400)

  await db.update(emailVerifications)
    .set({ verifiedAt: new Date().toISOString() })
    .where(eq(emailVerifications.id, record.id))
    .execute()

  return c.json({ message: '邮箱激活成功' })
})

router.post('/login', zValidator('json', LoginUserSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const user = await db.select().from(users).where(eq(users.email, email)).get()
  if (!user) return c.json({ error: '邮箱或密码错误' }, 401)

  const activation = await db.select().from(emailVerifications)
    .where(and(eq(emailVerifications.userId, user.id), isNotNull(emailVerifications.verifiedAt)))
    .get()

  if (!activation) {
    return c.json({ error: '邮箱未激活，请先验证邮箱' }, 403)
  }

  const hash = await hashPassword(password, user.passwordSalt)
  if (hash !== user.passwordHash) return c.json({ error: '邮箱或密码错误' }, 401)

  const token = crypto.randomUUID()
  const session = JSON.stringify({ userId: user.id, sessionsVersion: user.sessionsVersion })
  await c.env.KV.put(token, session, { expirationTtl: SESSION_TTL_SECONDS })

  return c.json({ token })
})

router.post('/logout', authMiddleware, async (c) => {
  const token = c.get('token' as never) as string
  await c.env.KV.delete(token)
  return c.json({ message: '已退出登录' })
})

router.get('/me', authMiddleware, async (c) => {
  const user = c.get('user' as never) as {
    id: string; email: string; sessionsVersion: number; activeGameAccountId: string | null
  }
  return c.json({
    id: user.id,
    email: user.email,
    activeGameAccountId: user.activeGameAccountId,
  })
})

router.put('/me/active_game_account', authMiddleware, zValidator('json', SwitchActiveGameAccountSchema), async (c) => {
  const user = c.get('user' as never) as { id: string }
  const { gameAccountId } = c.req.valid('json')
  const db = drizzle(c.env.DB)

  const account = await db.select().from(gameAccounts)
    .where(and(eq(gameAccounts.id, gameAccountId), eq(gameAccounts.userId, user.id), eq(gameAccounts.status, 'active')))
    .get()

  if (!account) return c.json({ error: '游戏账号不存在或未激活' }, 404)

  await db.update(users).set({ activeGameAccountId: gameAccountId }).where(eq(users.id, user.id)).execute()

  return c.json({ message: '游戏角色切换成功' })
})

router.post('/forgot_password', zValidator('json', ForgotPasswordSchema), async (c) => {
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
      await sendPasswordResetEmail(c.env.RESEND_API_KEY, c.env.APP_BASE_URL, email, token)
    } catch {
      // Non-fatal
    }
  }

  return c.json({ message: '如果该邮箱存在，重置邮件已发送' })
})

router.post('/reset_password', zValidator('json', ResetPasswordSchema), async (c) => {
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
})

export { router as usersRouter }
