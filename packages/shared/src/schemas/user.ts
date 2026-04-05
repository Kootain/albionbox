import { z } from 'zod';

export const BindEmailSchema = z.object({
  email: z.string().email('无效的邮箱格式'),
  code: z.string().length(6, '验证码必须是6位').optional(), // 获取验证码时不需要，绑定时需要
});

export const BindGameCharacterSchema = z.object({
  characterName: z.string().min(1, '角色名不能为空'),
});