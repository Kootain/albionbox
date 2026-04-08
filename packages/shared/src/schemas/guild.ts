import { z } from 'zod'

export const CreateGuildSchema = z.object({
  name: z.string().min(1),
  server: z.enum(['asia', 'eu', 'us']),
})

export const CreateRoleSchema = z.object({
  name: z.string().min(1),
})

export const AssignRolePermissionSchema = z.object({
  permissionKey: z.string(),
})

export const AddMemberSchema = z.object({
  userId: z.string().optional(),
  gameAccountId: z.string().optional(),
})

export const AssignMemberRoleSchema = z.object({
  roleId: z.string(),
})

export const ChestPositionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
})
