import type { AuthResponse, GameAccountApplication, GameCharacter, OauthAccount, UserContext } from '../../types/domain';
import { apiClient } from '../../lib/api-client';

export const usersApi = {
  sendRegisterCode(email: string) {
    return apiClient.post<{ message: string; expiresInSeconds: number }>('/users/auth/send_register_code', { email });
  },
  register(payload: { email: string; code: string; password: string }) {
    return apiClient.post<AuthResponse>('/users/auth/register', payload);
  },
  login(payload: { email: string; password: string }) {
    return apiClient.post<AuthResponse>('/users/auth/login', payload);
  },
  sendResetCode(email: string) {
    return apiClient.post<{ message: string; expiresInSeconds: number }>('/users/auth/send_reset_code', { email });
  },
  resetPassword(payload: { email: string; code: string; newPassword: string }) {
    return apiClient.post<AuthResponse>('/users/auth/reset_password', payload);
  },
  getDashboard() {
    return apiClient.get<UserContext>('/users/dashboard');
  },
  getOauthAccounts() {
    return apiClient.get<{ oauthAccounts: OauthAccount[] }>('/users/oauth_accounts');
  },
  bindOauthAccount(payload: { provider: 'kook' | 'discord'; providerAccountId: string; providerAccountName?: string }) {
    return apiClient.post<{ message: string; oauthAccounts: OauthAccount[] }>('/users/oauth_accounts', payload);
  },
  unbindOauthAccount(provider: 'kook' | 'discord') {
    return apiClient.delete<{ message: string; oauthAccounts: OauthAccount[] }>(`/users/oauth_accounts/${provider}`);
  },
  getGameCharacters() {
    return apiClient.get<{ gameCharacters: GameCharacter[] }>('/users/game_characters');
  },
  getGameApplications() {
    return apiClient.get<{ gameAccountApplications: GameAccountApplication[] }>('/users/game_account_applications');
  },
  createGameApplication(payload: { server: 'asia' | 'europe' | 'america'; gameAccountId: string; gameCharacterName?: string }) {
    return apiClient.post<{ message: string; application: GameAccountApplication }>('/users/game_account_applications', payload);
  },
  switchCurrentGameCharacter(gameCharacterId: string) {
    return apiClient.post<UserContext & { message: string }>('/users/game_characters/switch_current', { gameCharacterId });
  },
  getAdminGameApplications(status?: 'pending' | 'approved' | 'rejected') {
    return apiClient.get<{ gameAccountApplications: GameAccountApplication[] }>(
      '/users/admin/game_account_applications',
      status ? { status } : undefined
    );
  },
  reviewGameApplication(applicationId: string, payload: { status: 'approved' | 'rejected'; reviewNote?: string }) {
    return apiClient.post<{ message: string; application: GameAccountApplication }>(
      `/users/admin/game_account_applications/${applicationId}/review`,
      payload
    );
  },
};
