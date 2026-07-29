import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // helper to parse JWT payload from localStorage token
  const getUserFromToken = (): User | null => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return null;
      const payloadBase64 = token.split('.')[1];
      const decoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload: any = JSON.parse(decoded);
      // construct minimal User object
      return {
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
      } as User;
    } catch {
      return null;
    }
  };

  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authApi.me();
      setUser(data);
    } catch (err) {
      // fallback to token payload if available
      const fallback = getUserFromToken();
      setUser(fallback || null);
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
    // Also clear cookie
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    router.push('/login');
  };

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  const hasPermission = (perm: string) => user?.permissions?.includes(perm) ?? false;

  return { user, loading, logout, hasRole, hasPermission, refetch: fetchMe };
}
