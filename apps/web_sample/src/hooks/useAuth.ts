import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface UserProfile {
  uid: string;
  email: string;
  gameAccounts?: {
    gameId: string;
    server: string;
    status: 'pending' | 'verified';
    token: string;
  }[];
  selectedCharacterId?: string;
  kookId?: string;
  discordId?: string;
  role?: 'admin' | 'user';
  createdAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = localStorage.getItem('albion_erp_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.me.$get();
      if (res.ok) {
        const { user: userData } = await res.json();
        setUser(userData);
        setProfile(userData);
      } else {
        localStorage.removeItem('albion_erp_token');
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    
    // Listen for storage changes (e.g. login/logout in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'albion_erp_token') {
        fetchMe();
      }
    });
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'kootain.gao@gmail.com';

  return { user, profile, loading, isAdmin, refresh: fetchMe };
}
