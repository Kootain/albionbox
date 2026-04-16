import type {
  users,
  emailVerifications,
  passwordResetTokens,
  gameAccounts,
  bindingTokens,
  guilds,
  guildBindingTokens,
  guildMembers,
  regearTickets,
  regearTicketBattles,
  regears,
  regearLogs,
  permissions,
  roles,
  rolePermissions,
  userPlatformRoles,
  guildMemberRoles,
} from './schema'

export type User = typeof users.$inferSelect
export type EmailVerification = typeof emailVerifications.$inferSelect
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type GameAccount = typeof gameAccounts.$inferSelect
export type BindingToken = typeof bindingTokens.$inferSelect

export type Guild = typeof guilds.$inferSelect
export type GuildBindingToken = typeof guildBindingTokens.$inferSelect
export type GuildMember = typeof guildMembers.$inferSelect

export type RegearTicket = typeof regearTickets.$inferSelect
export type RegearTicketBattle = typeof regearTicketBattles.$inferSelect
export type Regear = typeof regears.$inferSelect
export type RegearLog = typeof regearLogs.$inferSelect

export type Permission = typeof permissions.$inferSelect
export type Role = typeof roles.$inferSelect
export type RolePermission = typeof rolePermissions.$inferSelect
export type UserPlatformRole = typeof userPlatformRoles.$inferSelect
export type GuildMemberRole = typeof guildMemberRoles.$inferSelect
