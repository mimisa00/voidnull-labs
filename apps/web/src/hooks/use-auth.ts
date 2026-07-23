'use client';
import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User { sub: string; email: string; roles: string[]; permissions: string[] }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try { await authApi.logout(refreshToken || undefined); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Also clear cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    router.push('/login');
  };

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  const hasPermission = (perm: string) => user?.permissions?.includes(perm) ?? false;

  return { user, loading, logout, hasRole, hasPermission, refetch: fetchMe };
}
