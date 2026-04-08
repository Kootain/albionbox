import type {
  GuildMember,
  GuildPermission,
  GuildRegistrationApplication,
  GuildRole,
  GuildSnapshot,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';

export const guildsApi = {
  getMyApplications() {
    return apiClient.get<{ guildRegistrationApplications: GuildRegistrationApplication[] }>('/guilds/registration_applications');
  },
  createApplication(payload: { guildName: string; server: 'asia' | 'europe' | 'america' }) {
    return apiClient.post<{ message: string; application: GuildRegistrationApplication }>('/guilds/registration_applications', payload);
  },
  getAdminApplications(status?: 'pending' | 'approved' | 'rejected') {
    return apiClient.get<{ guildRegistrationApplications: GuildRegistrationApplication[] }>(
      '/guilds/admin/registration_applications',
      status ? { status } : undefined
    );
  },
  reviewApplication(applicationId: string, payload: { status: 'approved' | 'rejected'; reviewNote?: string }) {
    return apiClient.post<{ message: string; application: GuildRegistrationApplication }>(
      `/guilds/admin/registration_applications/${applicationId}/review`,
      payload
    );
  },
  getGuild(guildId: string) {
    return apiClient.get<GuildSnapshot>(`/guilds/${guildId}`);
  },
  getPermissions(guildId: string) {
    return apiClient.get<{ permissions: GuildPermission[] }>(`/guilds/${guildId}/permissions`);
  },
  getRoles(guildId: string) {
    return apiClient.get<{ roles: GuildRole[] }>(`/guilds/${guildId}/roles`);
  },
  createRole(guildId: string, payload: { roleName: string; permissionKeys: GuildPermission['permissionKey'][] }) {
    return apiClient.post<{ message: string; role: GuildRole | null }>(`/guilds/${guildId}/roles`, payload);
  },
  updateRole(guildId: string, roleId: string, payload: { roleName?: string; permissionKeys?: GuildPermission['permissionKey'][] }) {
    return apiClient.patch<{ message: string; role: GuildRole | null }>(`/guilds/${guildId}/roles/${roleId}`, payload);
  },
  deleteRole(guildId: string, roleId: string) {
    return apiClient.delete<{ message: string }>(`/guilds/${guildId}/roles/${roleId}`);
  },
  getMembers(guildId: string) {
    return apiClient.get<{ members: GuildMember[] }>(`/guilds/${guildId}/members`);
  },
  addMember(
    guildId: string,
    payload: { bindingType: 'platform_user' | 'game_character'; userId?: string; gameCharacterId?: string; roleIds?: string[] }
  ) {
    return apiClient.post<{ message: string; member: GuildMember | null }>(`/guilds/${guildId}/members`, payload);
  },
  updateMemberRoles(guildId: string, memberId: string, roleIds: string[]) {
    return apiClient.patch<{ message: string; member: GuildMember | null }>(`/guilds/${guildId}/members/${memberId}/roles`, { roleIds });
  },
  updateMemberBox(guildId: string, memberId: string, payload: { coordinateX: number; coordinateY: number }) {
    return apiClient.patch<{ message: string; boxCoordinate: GuildMember['boxCoordinate'] }>(
      `/guilds/${guildId}/members/${memberId}/box_coordinate`,
      payload
    );
  },
  removeMember(guildId: string, memberId: string) {
    return apiClient.delete<{ message: string }>(`/guilds/${guildId}/members/${memberId}`);
  },
};
