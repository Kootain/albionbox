import { z } from 'zod'

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
})

export const SwitchActiveGameAccountSchema = z.object({
  gameAccountId: z.string(),
})

export const SetupAdminSchema = z.object({
  userId: z.string(),
})
