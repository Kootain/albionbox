import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usersApi } from '../modules/users/api';
import { sessionStore } from '../lib/session';
import type { AuthResponse, UserContext } from '../types/domain';
import { AuthContext } from './auth-context-value';
import type { AuthContextValue } from './auth-types';

const toUserContext = (response: AuthResponse): UserContext => ({
  user: response.user,
  roleContext: response.roleContext,
  oauthAccounts: response.oauthAccounts,
  gameCharacters: response.gameCharacters,
  gameAccountApplications: response.gameAccountApplications,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    sessionStore.set(response.sessionToken);
    setUserContext(toUserContext(response));
  }, []);

  const refresh = useCallback(async () => {
    const sessionToken = sessionStore.get();

    if (!sessionToken) {
      setUserContext(null);
      setLoading(false);
      return;
    }

    try {
      const nextContext = await usersApi.getDashboard();
      setUserContext(nextContext);
    } catch {
      sessionStore.clear();
      setUserContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => {
      setLoading(true);
      void refresh();
    };

    window.addEventListener('albionbox:session-change', handler as EventListener);
    return () => window.removeEventListener('albionbox:session-change', handler as EventListener);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      userContext,
      loading,
      isAuthenticated: Boolean(userContext),
      async login(payload) {
        const response = await usersApi.login(payload);
        applyAuthResponse(response);
      },
      async register(payload) {
        const response = await usersApi.register(payload);
        applyAuthResponse(response);
      },
      async resetPassword(payload) {
        const response = await usersApi.resetPassword(payload);
        applyAuthResponse(response);
      },
      logout() {
        sessionStore.clear();
        setUserContext(null);
      },
      refresh,
      applyAuthResponse,
    }),
    [applyAuthResponse, loading, refresh, userContext]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
