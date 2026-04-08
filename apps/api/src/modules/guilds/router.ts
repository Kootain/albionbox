import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import {
  AddGuildMemberSchema,
  CreateGuildRegistrationApplicationSchema,
  CreateGuildRoleSchema,
  QueryGuildRegistrationApplicationsSchema,
  ReviewGuildRegistrationApplicationSchema,
  UpdateGuildMemberBoxCoordinateSchema,
  UpdateGuildMemberRolesSchema,
  UpdateGuildRoleSchema,
} from '@albionbox/shared';
import { requireAdmin, requireAuth } from '../shared/auth';
import { toErrorResponse } from '../shared/errors';
import { type GuildAccessContext, requireGuildPermission } from '../shared/guild-access';
import {
  addGuildMember,
  createGuildRegistrationApplication,
  createGuildRole,
  deleteGuildRole,
  getGuild,
  listAdminGuildRegistrationApplications,
  listGuildMembers,
  listGuildPermissions,
  listGuildRegistrationApplications,
  listGuildRoles,
  removeGuildMember,
  reviewGuildRegistrationApplication,
  updateGuildMemberBoxCoordinate,
  updateGuildMemberRoles,
  updateGuildRole,
} from './service';

const guildsApp = new Hono<{
  Bindings: Env;
  Variables: {
    userId: string;
    sessionToken: string;
    guildAccess: GuildAccessContext;
  };
}>();

guildsApp.get('/registration_applications', requireAuth, async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGuildRegistrationApplications(db, c.get('userId')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.post('/registration_applications', requireAuth, zValidator('json', CreateGuildRegistrationApplicationSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await createGuildRegistrationApplication(db, c.get('userId'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.get(
  '/admin/registration_applications',
  requireAuth,
  requireAdmin('仅平台管理员可执行该操作'),
  zValidator('query', QueryGuildRegistrationApplicationsSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await listAdminGuildRegistrationApplications(db, c.req.valid('query').status));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

guildsApp.post(
  '/admin/registration_applications/:application_id/review',
  requireAuth,
  requireAdmin('仅平台管理员可执行该操作'),
  zValidator('json', ReviewGuildRegistrationApplicationSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await reviewGuildRegistrationApplication(db, c.get('userId'), c.req.param('application_id'), c.req.valid('json'))
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

guildsApp.get('/:guild_id', requireAuth, requireGuildPermission(['guild:view']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await getGuild(db, c.req.param('guild_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.get('/:guild_id/permissions', requireAuth, requireGuildPermission(['guild:view']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGuildPermissions(db, c.req.param('guild_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.get('/:guild_id/roles', requireAuth, requireGuildPermission(['guild:view']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGuildRoles(db, c.req.param('guild_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.post('/:guild_id/roles', requireAuth, requireGuildPermission(['guild:manage_roles']), zValidator('json', CreateGuildRoleSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await createGuildRole(db, c.req.param('guild_id'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.patch(
  '/:guild_id/roles/:role_id',
  requireAuth,
  requireGuildPermission(['guild:manage_roles']),
  zValidator('json', UpdateGuildRoleSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await updateGuildRole(db, c.req.param('guild_id'), c.req.param('role_id'), c.req.valid('json')));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

guildsApp.delete('/:guild_id/roles/:role_id', requireAuth, requireGuildPermission(['guild:manage_roles']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await deleteGuildRole(db, c.req.param('guild_id'), c.req.param('role_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.get('/:guild_id/members', requireAuth, requireGuildPermission(['guild:view']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await listGuildMembers(db, c.req.param('guild_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.post('/:guild_id/members', requireAuth, requireGuildPermission(['guild:manage_members']), zValidator('json', AddGuildMemberSchema), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await addGuildMember(db, c.req.param('guild_id'), c.get('guildAccess'), c.req.valid('json')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

guildsApp.patch(
  '/:guild_id/members/:member_id/roles',
  requireAuth,
  requireGuildPermission(['guild:manage_members']),
  zValidator('json', UpdateGuildMemberRolesSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(await updateGuildMemberRoles(db, c.req.param('guild_id'), c.req.param('member_id'), c.req.valid('json').roleIds));
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

guildsApp.patch(
  '/:guild_id/members/:member_id/box_coordinate',
  requireAuth,
  requireGuildPermission(['guild:manage_boxes']),
  zValidator('json', UpdateGuildMemberBoxCoordinateSchema),
  async (c) => {
    try {
      const db = drizzle(c.env.DB);
      return c.json(
        await updateGuildMemberBoxCoordinate(db, c.req.param('guild_id'), c.req.param('member_id'), c.req.valid('json'))
      );
    } catch (error) {
      return toErrorResponse(c, error);
    }
  }
);

guildsApp.delete('/:guild_id/members/:member_id', requireAuth, requireGuildPermission(['guild:manage_members']), async (c) => {
  try {
    const db = drizzle(c.env.DB);
    return c.json(await removeGuildMember(db, c.req.param('guild_id'), c.req.param('member_id')));
  } catch (error) {
    return toErrorResponse(c, error);
  }
});

export default guildsApp;
