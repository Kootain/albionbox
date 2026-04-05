import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';

// 从我们自己的共享包导入 Zod 校验规则
import { BindEmailSchema, BindGameCharacterSchema } from '@albionbox/shared';
// 从数据库包导入表结构 (如果使用了 barrel file index.ts 统一导出，路径可以更简短)
import { users, oauthAccounts, gameCharacters } from '@albionbox/db/src/schema/users';

// ------------------------------------------------------------------
// 1. 核心类型定义
// ------------------------------------------------------------------
// 我们不再手动定义 DB 和 KV 的类型，直接使用 cf-typegen 自动生成的 CloudflareBindings！

// 定义请求上下文中的自定义变量（由中间件注入）
type Variables = {
  userId: string;
};

// 实例化带有完整环境类型推导的 Hono 路由
const usersApp = new Hono<{ Bindings: Env; Variables: Variables }>();

// ------------------------------------------------------------------
// 2. 全局鉴权中间件 (Auth Middleware)
// ------------------------------------------------------------------
usersApp.use('*', async (c, next) => {
  // TODO: 真实场景下，在此解析请求头中的 JWT 或 Session，验证合法性
  // 目前假装我们从 Token 里解析出了一个已登录的用户 ID
  c.set('userId', 'user_123456'); 
  await next();
});

// ------------------------------------------------------------------
// 3. 业务路由接口
// ------------------------------------------------------------------

/**
 * 接口 1：获取我的主页信息 (并发联表查询)
 */
usersApp.get('/me', async (c) => {
  const userId = c.get('userId');
  const db = drizzle(c.env.DB); // c.env.DB 现在自带完美的 D1Database 类型

  // 并行查询，最大化 Serverless 优势
  const [userRecord, oauths, chars] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, userId)).all(),
    db.select().from(gameCharacters).where(eq(gameCharacters.userId, userId)).all()
  ]);

  if (!userRecord) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    ...userRecord,
    oauthAccounts: oauths,
    gameCharacters: chars
  });
});

/**
 * 接口 2：发送邮箱验证码 (利用 CF KV 自动过期)
 */
usersApp.post('/email/send_code', zValidator('json', BindEmailSchema), async (c) => {
  const { email } = c.req.valid('json');
  
  // 生成 6 位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 存入 Cloudflare KV，有效期 5 分钟 (300 秒)
  const kvKey = `email_code:${email}`;
  await c.env.KV.put(kvKey, code, { expirationTtl: 300 });

  // TODO: 接入 Resend 或 Mailchannels 发送真实邮件
  console.log(`[Mock Email] 验证码 ${code} 已发送至 ${email}`);

  return c.json({ message: '验证码发送成功，有效期5分钟' });
});

/**
 * 接口 3：校验验证码并绑定邮箱
 */
usersApp.post('/email/bind', zValidator('json', BindEmailSchema), async (c) => {
  const { email, code } = c.req.valid('json');
  const userId = c.get('userId');

  if (!code) {
    return c.json({ error: '请提供验证码' }, 400);
  }

  // 去 KV 查验证码
  const kvKey = `email_code:${email}`;
  const storedCode = await c.env.KV.get(kvKey);

  if (!storedCode || storedCode !== code) {
    return c.json({ error: '验证码无效或已过期' }, 400);
  }

  // 验证通过，更新 D1 数据库
  const db = drizzle(c.env.DB);
  await db.update(users)
    .set({ email, emailVerified: true })
    .where(eq(users.id, userId));

  // 验证码阅后即焚
  await c.env.KV.delete(kvKey);

  return c.json({ message: '邮箱绑定成功！' });
});

/**
 * 接口 4：绑定 Albion 游戏角色
 */
usersApp.post('/game/bind', zValidator('json', BindGameCharacterSchema), async (c) => {
  const { characterName } = c.req.valid('json');
  const userId = c.get('userId');
  const db = drizzle(c.env.DB);

  // 请求 Albion 官方 API 获取真实角色 ID
  const albionRes = await fetch(`https://gameinfo.albiononline.com/api/gameinfo/search?q=${encodeURIComponent(characterName)}`);
  const albionData: any = await albionRes.json();

  const exactMatch = albionData?.players?.find((p: any) => p.Name.toLowerCase() === characterName.toLowerCase());
  
  if (!exactMatch) {
    return c.json({ error: '在 Albion 数据库中未找到该角色，请检查拼写' }, 404);
  }

  const realCharacterId = exactMatch.Id;
  const realCharacterName = exactMatch.Name;

  try {
    // 使用 Web Crypto API 生成唯一 ID
    const newId = `char_${crypto.randomUUID()}`;

    await db.insert(gameCharacters).values({
      id: newId,
      userId: userId,
      characterId: realCharacterId,
      characterName: realCharacterName,
    });

    return c.json({ 
      message: '游戏角色绑定成功！', 
      character: { realCharacterName, realCharacterId } 
    });
  } catch (error: any) {
    // 处理唯一键冲突
    if (error.message.includes('UNIQUE constraint failed: game_characters.character_id')) {
      return c.json({ error: '该游戏角色已经被其他平台账号绑定！' }, 409);
    }
    return c.json({ error: '绑定失败，请稍后重试' }, 500);
  }
});

export default usersApp;