import { z } from 'zod'

export const CreateGuildSchema = z.object({
  id: z.string().min(1),
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

export const UpdateGuildSettingsSchema = z.object({
  regearConfig: z.object({
    allowedSlots: z.array(z.string()),
    defaultPLevel: z.number().int().optional(),
    policies: z.object({
      noRegear: z.object({
        players: z.array(z.object({
          id: z.string(),
          name: z.string()
        }))
      }),
      levelGroups: z.array(z.object({
        id: z.string(),
        name: z.string(),
        maxPLevel: z.number().int(),
        players: z.array(z.object({
          id: z.string(),
          name: z.string()
        }))
      }))
    }).optional()
  }).optional(),
  chestRooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    assignments: z.array(z.object({
      x: z.number().int(),
      y: z.number().int(),
      playerId: z.string(),
      playerName: z.string(),
    })),
  })).optional(),
  kookGuildId: z.string().optional().nullable(),
})

export type { Guild, GuildMember, Role, Permission, GuildMemberRole } from '@albionbox/db'
