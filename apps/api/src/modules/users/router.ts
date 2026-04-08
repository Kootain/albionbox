import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import {
  BindOauthAccountSchema,
  CreateGameAccountBindingApplicationSchema,
  LoginUserSchema,
  QueryGameAccountApplicationsSchema,
  RegisterUserSchema,
  ResetPasswordSchema,
  ReviewGameAccountBindingApplicationSchema,
  SwitchCurrentGameCharacterSchema,
  UserEmailSchema,
} from '@albionbox/shared';
import { requireAdmin, requireAuth } from '../shared/auth';
import { toErrorResponse } from '../shared/errors';
import {
  bindOauthAccount,
  createGameAccountApplication,
  getUserDashboard,
  listAdminGameAccountApplications,
  listGameAccountApplications,
  listGameCharacters,
  listOauthAccounts,
  loginUser,
  registerUser,
  resetPassword,
  reviewGameAccountApplication,
  sendRegisterCode,
  sendResetCode,
  switchCurrentGameCharacter,
  unbindOauthAccount,
} from './service';

const usersApp = new Hono<{
  Bindings: Env;
  Variables: {
    userId: string;
    sessionToken: string;
  };
}>();

usersApp.post('/auth/send_register_code', zValidator('json', UserEmailSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await sendRegisterCode(db, c.env.KV, c.req.valid('json').email));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/auth/register', zValidator('json', RegisterUserSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await registerUser(db, c.env.KV, c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/auth/login', zValidator('json', LoginUserSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await loginUser(db, c.env.KV, c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/auth/send_reset_code', zValidator('json', UserEmailSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await sendResetCode(db, c.env.KV, c.req.valid('json').email));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/auth/reset_password', zValidator('json', ResetPasswordSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await resetPassword(db, c.env.KV, c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/me', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await getUserDashboard(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/dashboard', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await getUserDashboard(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/oauth_accounts', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listOauthAccounts(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/oauth_accounts', requireAuth, zValidator('json', BindOauthAccountSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await bindOauthAccount(db, c.get('userId'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.delete('/oauth_accounts/:provider', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await unbindOauthAccount(db, c.get('userId'), c.req.param('provider')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/game_characters', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGameCharacters(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/game_account_applications', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGameAccountApplications(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/game_account_applications', requireAuth, zValidator('json', CreateGameAccountBindingApplicationSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await createGameAccountApplication(db, c.get('userId'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post('/game_characters/switch_current', requireAuth, zValidator('json', SwitchCurrentGameCharacterSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await switchCurrentGameCharacter(db, c.get('userId'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.get('/admin/game_account_applications', requireAdmin(), zValidator('query', QueryGameAccountApplicationsSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listAdminGameAccountApplications(db, c.req.valid('query').status));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

usersApp.post(
  '/admin/game_account_applications/:application_id/review',
  requireAdmin(),
  zValidator('json', ReviewGameAccountBindingApplicationSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await reviewGameAccountApplication(db, c.get('userId'), c.req.param('application_id'), c.req.valid('json'))
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

export default usersApp;
