import { z } from 'zod';
import { AlbionServerSchema } from './user';

export const GuildRegistrationApplicationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const GuildMemberBindingTypeSchema = z.enum(['platform_user', 'game_character']);
export const GuildPermissionKeySchema = z.enum([
  'guild:view',
  'guild:manage_roles',
  'guild:manage_members',
  'guild:manage_boxes',
  'battle:manage_records',
  'reimbursement:manage_sessions',
  'reimbursement:view_summary',
]);

export const CreateGuildRegistrationApplicationSchema = z.object({
  guildName: z.string().trim().min(2, '工会名称至少需要 2 个字符').max(64, '工会名称不能超过 64 个字符'),
  server: AlbionServerSchema,
});

export const QueryGuildRegistrationApplicationsSchema = z.object({
  status: GuildRegistrationApplicationStatusSchema.optional(),
});

export const ReviewGuildRegistrationApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(500, '审核备注过长').optional(),
});

export const CreateGuildRoleSchema = z.object({
  roleName: z.string().trim().min(2, '角色名称至少需要 2 个字符').max(32, '角色名称不能超过 32 个字符'),
  permissionKeys: z
    .array(GuildPermissionKeySchema)
    .min(1, '至少选择一个权限')
    .max(20, '权限数量不能超过 20 个')
    .refine((permissionKeys) => new Set(permissionKeys).size === permissionKeys.length, '权限不能重复'),
});

export const UpdateGuildRoleSchema = z
  .object({
    roleName: z.string().trim().min(2, '角色名称至少需要 2 个字符').max(32, '角色名称不能超过 32 个字符').optional(),
    permissionKeys: z
      .array(GuildPermissionKeySchema)
      .min(1, '至少选择一个权限')
      .max(20, '权限数量不能超过 20 个')
      .refine((permissionKeys) => new Set(permissionKeys).size === permissionKeys.length, '权限不能重复')
      .optional(),
  })
  .refine((value) => value.roleName !== undefined || value.permissionKeys !== undefined, '至少提供一个更新字段');

export const AddGuildMemberSchema = z
  .object({
    bindingType: GuildMemberBindingTypeSchema,
    userId: z.string().trim().min(1, '平台用户 ID 不能为空').optional(),
    gameCharacterId: z.string().trim().min(1, '游戏角色 ID 不能为空').optional(),
    roleIds: z
      .array(z.string().trim().min(1, '角色 ID 不能为空'))
      .max(20, '角色数量不能超过 20 个')
      .refine((roleIds) => new Set(roleIds).size === roleIds.length, '角色不能重复')
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.bindingType === 'platform_user' && !value.userId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '平台账号绑定必须提供 userId',
        path: ['userId'],
      });
    }

    if (value.bindingType === 'game_character' && !value.gameCharacterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '游戏角色绑定必须提供 gameCharacterId',
        path: ['gameCharacterId'],
      });
    }
  });

export const UpdateGuildMemberRolesSchema = z.object({
  roleIds: z
    .array(z.string().trim().min(1, '角色 ID 不能为空'))
    .max(20, '角色数量不能超过 20 个')
    .refine((roleIds) => new Set(roleIds).size === roleIds.length, '角色不能重复'),
});

export const UpdateGuildMemberBoxCoordinateSchema = z.object({
  coordinateX: z.number().int('箱子 X 坐标必须为整数').min(0, '箱子 X 坐标不能小于 0').max(999, '箱子 X 坐标过大'),
  coordinateY: z.number().int('箱子 Y 坐标必须为整数').min(0, '箱子 Y 坐标不能小于 0').max(999, '箱子 Y 坐标过大'),
});
