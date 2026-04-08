import { z } from 'zod';

export const UserProviderSchema = z.enum(['kook', 'discord']);
export const AlbionServerSchema = z.enum(['asia', 'europe', 'america']);
export const UserEmailSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
});
export const RegisterUserSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
  code: z.string().trim().length(6, '验证码必须为 6 位'),
  password: z.string().min(8, '密码至少需要 8 位').max(128, '密码长度不能超过 128 位'),
});
export const LoginUserSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少需要 8 位').max(128, '密码长度不能超过 128 位'),
});
export const ResetPasswordSchema = z.object({
  email: z.string().trim().email('请输入有效的邮箱地址'),
  code: z.string().trim().length(6, '验证码必须为 6 位'),
  newPassword: z.string().min(8, '密码至少需要 8 位').max(128, '密码长度不能超过 128 位'),
});
export const BindOauthAccountSchema = z.object({
  provider: UserProviderSchema,
  providerAccountId: z.string().trim().min(1, '第三方账号 ID 不能为空').max(128, '第三方账号 ID 过长'),
  providerAccountName: z.string().trim().max(128, '第三方账号名称过长').optional(),
});
export const GameAccountApplicationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const CreateGameAccountBindingApplicationSchema = z.object({
  server: AlbionServerSchema,
  gameAccountId: z.string().trim().min(1, '游戏账号 ID 不能为空').max(64, '游戏账号 ID 过长'),
  gameCharacterName: z.string().trim().max(64, '角色名过长').optional(),
});
export const ReviewGameAccountBindingApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(500, '审核备注过长').optional(),
});
export const SwitchCurrentGameCharacterSchema = z.object({
  gameCharacterId: z.string().trim().min(1, '角色 ID 不能为空'),
});
export const QueryGameAccountApplicationsSchema = z.object({
  status: GameAccountApplicationStatusSchema.optional(),
});

export const BindEmailSchema = z.object({
  email: z.string().email('无效的邮箱格式'),
  code: z.string().length(6, '验证码必须是6位').optional(),
});

export const BindGameCharacterSchema = z.object({
  characterName: z.string().min(1, '角色名不能为空'),
});
