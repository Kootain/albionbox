import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  gameCharacterBindingApplications,
  gameCharacters,
  oauthAccounts,
  users,
} from '@albionbox/db/src/schema/users';
import { issueSession } from '../shared/auth';
import { AppError } from '../shared/errors';
import { normalizeOptionalText } from '../shared/utils';

type DbClient = ReturnType<typeof drizzle>;
type UserRecord = typeof users.$inferSelect;
type AlbionServer = 'asia' | 'europe' | 'america';
type EmailCodePayload = {
  code: string;
  createdAt: string;
};

const emailCodeTtlSeconds = 60 * 5;
const passwordIterations = 100_000;

const getRegisterCodeKey = (email: string) => `email_code:register:${email.toLowerCase()}`;
const getResetCodeKey = (email: string) => `email_code:reset:${email.toLowerCase()}`;

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const createEmailCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const createBindingToken = () => `bind_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;

export const hashPassword = async (password: string, salt: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: passwordIterations,
      hash: 'SHA-256',
    },
    key,
    256
  );

  return bufferToHex(derivedBits);
};

const storeEmailCode = async (kv: KVNamespace, key: string) => {
  const payload: EmailCodePayload = {
    code: createEmailCode(),
    createdAt: new Date().toISOString(),
  };

  await kv.put(key, JSON.stringify(payload), {
    expirationTtl: emailCodeTtlSeconds,
  });
};

const verifyEmailCode = async (kv: KVNamespace, key: string, code: string) => {
  const payload = await kv.get<EmailCodePayload>(key, 'json');
  return payload?.code === code;
};

const toPublicUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  emailVerified: user.emailVerified,
  currentGameCharacterId: user.currentGameCharacterId,
  isAdmin: user.isAdmin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const buildUserContext = async (db: DbClient, userId: string) => {
  const [userRecord, oauthRows, gameCharacterRows, applicationRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).get(),
    db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, userId)).orderBy(desc(oauthAccounts.updatedAt)).all(),
    db.select().from(gameCharacters).where(eq(gameCharacters.userId, userId)).orderBy(desc(gameCharacters.createdAt)).all(),
    db
      .select()
      .from(gameCharacterBindingApplications)
      .where(eq(gameCharacterBindingApplications.userId, userId))
      .orderBy(desc(gameCharacterBindingApplications.createdAt))
      .all(),
  ]);

  if (!userRecord) {
    return null;
  }

  const currentGameCharacter =
    gameCharacterRows.find((gameCharacter) => gameCharacter.id === userRecord.currentGameCharacterId) ?? null;

  return {
    user: toPublicUser(userRecord),
    roleContext: currentGameCharacter,
    oauthAccounts: oauthRows,
    gameCharacters: gameCharacterRows,
    gameAccountApplications: applicationRows,
  };
};

const requireUserContext = async (db: DbClient, userId: string) => {
  const context = await buildUserContext(db, userId);

  if (!context) {
    throw new AppError(404, '用户不存在');
  }

  return context;
};

export const sendRegisterCode = async (db: DbClient, kv: KVNamespace, email: string) => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (existingUser) {
    throw new AppError(409, '该邮箱已注册');
  }

  await storeEmailCode(kv, getRegisterCodeKey(normalizedEmail));

  return {
    message: '注册验证码已发送',
    expiresInSeconds: emailCodeTtlSeconds,
  };
};

export const registerUser = async (
  db: DbClient,
  kv: KVNamespace,
  payload: {
    email: string;
    code: string;
    password: string;
  }
) => {
  const normalizedEmail = payload.email.toLowerCase();
  const codeIsValid = await verifyEmailCode(kv, getRegisterCodeKey(normalizedEmail), payload.code);

  if (!codeIsValid) {
    throw new AppError(400, '验证码无效或已过期');
  }

  const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (existingUser) {
    throw new AppError(409, '该邮箱已注册');
  }

  const userId = `user_${crypto.randomUUID()}`;
  const passwordSalt = crypto.randomUUID();
  const passwordHash = await hashPassword(payload.password, passwordSalt);
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    emailVerified: true,
    passwordHash,
    passwordSalt,
    passwordUpdatedAt: now,
    updatedAt: now,
  });

  await kv.delete(getRegisterCodeKey(normalizedEmail));

  return {
    message: '注册成功',
    sessionToken: await issueSession(kv, userId),
    ...(await requireUserContext(db, userId)),
  };
};

export const loginUser = async (
  db: DbClient,
  kv: KVNamespace,
  payload: {
    email: string;
    password: string;
  }
) => {
  const normalizedEmail = payload.email.toLowerCase();
  const userRecord = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (!userRecord?.passwordHash || !userRecord.passwordSalt) {
    throw new AppError(401, '邮箱或密码错误');
  }

  const inputPasswordHash = await hashPassword(payload.password, userRecord.passwordSalt);

  if (inputPasswordHash !== userRecord.passwordHash) {
    throw new AppError(401, '邮箱或密码错误');
  }

  return {
    message: '登录成功',
    sessionToken: await issueSession(kv, userRecord.id),
    ...(await requireUserContext(db, userRecord.id)),
  };
};

export const sendResetCode = async (db: DbClient, kv: KVNamespace, email: string) => {
  const normalizedEmail = email.toLowerCase();
  const userRecord = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (userRecord?.passwordHash) {
    await storeEmailCode(kv, getResetCodeKey(normalizedEmail));
  }

  return {
    message: '如果邮箱已注册，重置验证码已发送',
    expiresInSeconds: emailCodeTtlSeconds,
  };
};

export const resetPassword = async (
  db: DbClient,
  kv: KVNamespace,
  payload: {
    email: string;
    code: string;
    newPassword: string;
  }
) => {
  const normalizedEmail = payload.email.toLowerCase();
  const userRecord = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();

  if (!userRecord?.id) {
    throw new AppError(404, '用户不存在');
  }

  const codeIsValid = await verifyEmailCode(kv, getResetCodeKey(normalizedEmail), payload.code);

  if (!codeIsValid) {
    throw new AppError(400, '验证码无效或已过期');
  }

  const passwordSalt = crypto.randomUUID();
  const passwordHash = await hashPassword(payload.newPassword, passwordSalt);
  const now = new Date();

  await db
    .update(users)
    .set({
      passwordSalt,
      passwordHash,
      passwordUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userRecord.id));

  await kv.delete(getResetCodeKey(normalizedEmail));

  return {
    message: '密码已重置',
    sessionToken: await issueSession(kv, userRecord.id),
    ...(await requireUserContext(db, userRecord.id)),
  };
};

export const getUserDashboard = async (db: DbClient, userId: string) => requireUserContext(db, userId);

export const listOauthAccounts = async (db: DbClient, userId: string) => {
  const rows = await db
    .select()
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .orderBy(desc(oauthAccounts.updatedAt))
    .all();

  return { oauthAccounts: rows };
};

export const bindOauthAccount = async (
  db: DbClient,
  userId: string,
  payload: {
    provider: 'kook' | 'discord';
    providerAccountId: string;
    providerAccountName?: string;
  }
) => {
  const now = new Date();
  const occupiedAccount = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, payload.provider),
        eq(oauthAccounts.providerAccountId, payload.providerAccountId),
        eq(oauthAccounts.status, 'active')
      )
    )
    .get();

  if (occupiedAccount && occupiedAccount.userId !== userId) {
    throw new AppError(409, '该第三方账号已被其他用户绑定');
  }

  const existingBinding = await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, payload.provider)))
    .get();

  if (existingBinding) {
    await db
      .update(oauthAccounts)
      .set({
        providerAccountId: payload.providerAccountId,
        providerAccountName: normalizeOptionalText(payload.providerAccountName),
        status: 'active',
        lastBoundAt: now,
        unboundAt: null,
        updatedAt: now,
      })
      .where(eq(oauthAccounts.id, existingBinding.id));
  } else {
    await db.insert(oauthAccounts).values({
      id: `oauth_${crypto.randomUUID()}`,
      userId,
      provider: payload.provider,
      providerAccountId: payload.providerAccountId,
      providerAccountName: normalizeOptionalText(payload.providerAccountName),
      status: 'active',
      lastBoundAt: now,
      updatedAt: now,
    });
  }

  return {
    message: '第三方账号绑定成功',
    ...(await listOauthAccounts(db, userId)),
  };
};

export const unbindOauthAccount = async (db: DbClient, userId: string, provider: string) => {
  if (provider !== 'kook' && provider !== 'discord') {
    throw new AppError(400, '不支持的第三方平台');
  }

  const existingBinding = await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
    .get();

  if (!existingBinding) {
    throw new AppError(404, '未找到绑定记录');
  }

  const now = new Date();

  await db
    .update(oauthAccounts)
    .set({
      providerAccountId: null,
      providerAccountName: null,
      status: 'unbound',
      unboundAt: now,
      updatedAt: now,
    })
    .where(eq(oauthAccounts.id, existingBinding.id));

  return {
    message: '第三方账号已解绑',
    ...(await listOauthAccounts(db, userId)),
  };
};

export const listGameCharacters = async (db: DbClient, userId: string) => {
  const rows = await db
    .select()
    .from(gameCharacters)
    .where(eq(gameCharacters.userId, userId))
    .orderBy(desc(gameCharacters.createdAt))
    .all();

  return { gameCharacters: rows };
};

export const listGameAccountApplications = async (db: DbClient, userId: string) => {
  const rows = await db
    .select()
    .from(gameCharacterBindingApplications)
    .where(eq(gameCharacterBindingApplications.userId, userId))
    .orderBy(desc(gameCharacterBindingApplications.createdAt))
    .all();

  return { gameAccountApplications: rows };
};

export const createGameAccountApplication = async (
  db: DbClient,
  userId: string,
  payload: {
    server: AlbionServer;
    gameAccountId: string;
    gameCharacterName?: string;
  }
) => {
  const [existingApplications, approvedCharacters, existingApprovedCharacter] = await Promise.all([
    db
      .select()
      .from(gameCharacterBindingApplications)
      .where(eq(gameCharacterBindingApplications.userId, userId))
      .all(),
    db.select().from(gameCharacters).where(eq(gameCharacters.userId, userId)).all(),
    db
      .select()
      .from(gameCharacters)
      .where(and(eq(gameCharacters.server, payload.server), eq(gameCharacters.gameAccountId, payload.gameAccountId)))
      .get(),
  ]);

  if (existingApprovedCharacter && existingApprovedCharacter.userId !== userId) {
    throw new AppError(409, '该游戏账号已被其他用户绑定');
  }

  const activeApplicationCount = existingApplications.filter((application) => application.status !== 'rejected').length;

  if (approvedCharacters.length >= 10 || activeApplicationCount >= 10) {
    throw new AppError(400, '每个用户最多绑定 10 个游戏账号');
  }

  const existingApplication = existingApplications.find(
    (application) => application.server === payload.server && application.gameAccountId === payload.gameAccountId
  );
  const now = new Date();
  const bindingToken = createBindingToken();

  if (existingApplication?.status === 'approved') {
    throw new AppError(409, '该游戏账号已经审核通过');
  }

  if (existingApplication?.status === 'pending') {
    return {
      message: '该游戏账号已有待审核申请',
      application: existingApplication,
    };
  }

  if (existingApplication?.status === 'rejected') {
    await db
      .update(gameCharacterBindingApplications)
      .set({
        gameCharacterName: normalizeOptionalText(payload.gameCharacterName),
        bindingToken,
        status: 'pending',
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: now,
      })
      .where(eq(gameCharacterBindingApplications.id, existingApplication.id));

    return {
      message: '已重新提交绑定申请',
      application: await db
        .select()
        .from(gameCharacterBindingApplications)
        .where(eq(gameCharacterBindingApplications.id, existingApplication.id))
        .get(),
    };
  }

  const applicationId = `game_app_${crypto.randomUUID()}`;

  await db.insert(gameCharacterBindingApplications).values({
    id: applicationId,
    userId,
    server: payload.server,
    gameAccountId: payload.gameAccountId,
    gameCharacterName: normalizeOptionalText(payload.gameCharacterName),
    bindingToken,
    status: 'pending',
    updatedAt: now,
  });

  return {
    message: '游戏账号绑定申请已提交，请等待管理员审核',
    application: await db
      .select()
      .from(gameCharacterBindingApplications)
      .where(eq(gameCharacterBindingApplications.id, applicationId))
      .get(),
  };
};

export const switchCurrentGameCharacter = async (
  db: DbClient,
  userId: string,
  payload: {
    gameCharacterId: string;
  }
) => {
  const gameCharacter = await db
    .select()
    .from(gameCharacters)
    .where(and(eq(gameCharacters.id, payload.gameCharacterId), eq(gameCharacters.userId, userId)))
    .get();

  if (!gameCharacter) {
    throw new AppError(404, '只能切换到已审核通过且属于当前用户的角色');
  }

  const now = new Date();

  await db
    .update(users)
    .set({
      currentGameCharacterId: gameCharacter.id,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  return {
    message: '当前角色已切换',
    ...(await requireUserContext(db, userId)),
  };
};

export const listAdminGameAccountApplications = async (
  db: DbClient,
  status?: 'pending' | 'approved' | 'rejected'
) => {
  const rows = status
    ? await db
        .select()
        .from(gameCharacterBindingApplications)
        .where(eq(gameCharacterBindingApplications.status, status))
        .orderBy(desc(gameCharacterBindingApplications.createdAt))
        .all()
    : await db.select().from(gameCharacterBindingApplications).orderBy(desc(gameCharacterBindingApplications.createdAt)).all();

  return { gameAccountApplications: rows };
};

export const reviewGameAccountApplication = async (
  db: DbClient,
  adminUserId: string,
  applicationId: string,
  payload: {
    status: 'approved' | 'rejected';
    reviewNote?: string;
  }
) => {
  const application = await db
    .select()
    .from(gameCharacterBindingApplications)
    .where(eq(gameCharacterBindingApplications.id, applicationId))
    .get();

  if (!application) {
    throw new AppError(404, '申请不存在');
  }

  if (application.status !== 'pending') {
    throw new AppError(409, '仅待审核申请可执行审核操作');
  }

  const now = new Date();
  const normalizedReviewNote = normalizeOptionalText(payload.reviewNote);

  if (payload.status === 'approved') {
    const existingCharacter = await db
      .select()
      .from(gameCharacters)
      .where(
        and(
          eq(gameCharacters.server, application.server as AlbionServer),
          eq(gameCharacters.gameAccountId, application.gameAccountId)
        )
      )
      .get();

    if (existingCharacter && existingCharacter.userId !== application.userId) {
      throw new AppError(409, '该游戏账号已被其他用户绑定');
    }

    if (!existingCharacter) {
      await db.insert(gameCharacters).values({
        id: `game_char_${crypto.randomUUID()}`,
        applicationId: application.id,
        userId: application.userId,
        server: application.server as AlbionServer,
        gameAccountId: application.gameAccountId,
        characterName: application.gameCharacterName,
        approvedAt: now,
        createdAt: now,
      });
    }

    const applicant = await db.select().from(users).where(eq(users.id, application.userId)).get();

    if (applicant && !applicant.currentGameCharacterId) {
      const approvedCharacter = await db
        .select()
        .from(gameCharacters)
        .where(eq(gameCharacters.applicationId, application.id))
        .get();

      if (approvedCharacter) {
        await db
          .update(users)
          .set({
            currentGameCharacterId: approvedCharacter.id,
            updatedAt: now,
          })
          .where(eq(users.id, applicant.id));
      }
    }
  }

  await db
    .update(gameCharacterBindingApplications)
    .set({
      status: payload.status,
      reviewNote: normalizedReviewNote,
      reviewedBy: adminUserId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(gameCharacterBindingApplications.id, application.id));

  return {
    message: payload.status === 'approved' ? '游戏账号绑定申请已审核通过' : '游戏账号绑定申请已驳回',
    application: await db
      .select()
      .from(gameCharacterBindingApplications)
      .where(eq(gameCharacterBindingApplications.id, application.id))
      .get(),
  };
};
