import type { AuthResponse, UserContext } from '../types/domain';

export type AuthContextValue = {
  userContext: UserContext | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; code: string; password: string }) => Promise<void>;
  resetPassword: (payload: { email: string; code: string; newPassword: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  applyAuthResponse: (response: AuthResponse) => void;
};
