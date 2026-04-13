import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { permissions, roles, rolePermissions } from '@albionbox/db'

const BUILT_IN_PERMISSIONS = [
  { key: 'platform:admin', module: 'platform', action: 'admin', identityType: 'platform' as const, description: '平台管理员权限' },
  { key: 'guild:manage', module: 'guild', action: 'manage', identityType: 'game' as const, description: '管理工会（设置、成员管理）' },
  { key: 'guild:view', module: 'guild', action: 'view', identityType: 'game' as const, description: '查看工会信息' },
  { key: 'guild:regear', module: 'guild', action: 'regear', identityType: 'game' as const, description: '管理/审批工会补装' },
  { key: 'regear:manage', module: 'regear', action: 'manage', identityType: 'game' as const, description: '创建/管理补装 Session' },
  { key: 'regear:approve', module: 'regear', action: 'approve', identityType: 'game' as const, description: '审批/拒绝补装记录' },
  { key: 'regear:configure', module: 'regear', action: 'configure', identityType: 'game' as const, description: '配置补装自动审批规则' },
  { key: 'battle:view', module: 'battle', action: 'view', identityType: 'game' as const, description: '查看战斗记录' },
]

export async function seedPermissions(db: D1Database) {
  const d = drizzle(db)
  const now = new Date().toISOString()

  for (const perm of BUILT_IN_PERMISSIONS) {
    const existing = await d.select().from(permissions).where(eq(permissions.key, perm.key)).get()
    if (!existing) {
      await d.insert(permissions).values({ id: crypto.randomUUID(), ...perm, }).execute()
    }
  }

  const adminPerm = await d.select().from(permissions).where(eq(permissions.key, 'platform:admin')).get()
  if (!adminPerm) return

  const existingRole = await d.select().from(roles).where(
    and(eq(roles.name, 'platform_admin'), eq(roles.scope, 'platform'))
  ).get()

  let adminRoleId: string
  if (!existingRole) {
    adminRoleId = crypto.randomUUID()
    await d.insert(roles).values({
      id: adminRoleId,
      scope: 'platform',
      name: 'platform_admin',
      isSystem: true,
      createdAt: now,
    }).execute()
  } else {
    adminRoleId = existingRole.id
  }

  const existingRolePerm = await d.select().from(rolePermissions).where(
    and(eq(rolePermissions.roleId, adminRoleId), eq(rolePermissions.permissionId, adminPerm.id))
  ).get()

  if (!existingRolePerm) {
    await d.insert(rolePermissions).values({ roleId: adminRoleId, permissionId: adminPerm.id }).execute()
  }
}
