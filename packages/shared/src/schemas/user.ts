import { z } from 'zod'

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  activeGameAccountId: z.string().nullable(),
  thirdPartyAccounts: z.array(z.object({
    provider: z.string(),
    providerUsername: z.string(),
    providerAvatar: z.string().nullable(),
  })).optional()
})


export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export const SwitchActiveGameAccountSchema = z.object({
  gameAccountId: z.string(),
})

export const SetupAdminSchema = z.object({
  userId: z.string(),
})

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1),
})

export const UnbindThirdPartySchema = z.object({
  provider: z.enum(['kook', 'discord']),
})

