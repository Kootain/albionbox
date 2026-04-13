import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../lib/api'
import { setToken, clearToken, getToken } from '../lib/session'

export interface UserProfile {
  id: string;
  email: string | null;
  activeGameAccountId: string | null;
  thirdPartyAccounts?: {
    provider: string;
    providerUsername: string;
    providerAvatar: string | null;
  }[];
  role?: 'admin' | 'user';
  createdAt?: string;
}

const ADMIN_EMAILS = new Set(
  (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(/[,\s]+/g)
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean)
)

interface AuthContextValue {
  user: UserProfile | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const res = await api.users.me.$get()
      if (res.ok) {
        const userData = await res.json() as UserProfile;
        setUser(userData)
        setProfile(userData)
      } else {
        clearToken()
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'albion_erp_token') {
        refreshUser()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshUser])

  const login = useCallback(async (token: string) => {
    setToken(token)
    await refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    clearToken()
    setUser(null)
    setProfile(null)
  }, [])

  const isAdmin = profile?.role === 'admin' || (user?.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false)

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout, refresh: refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
