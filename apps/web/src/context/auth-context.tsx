'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { authApi } from '@/lib/api'

interface User {
  sub: string
  email: string
  roles: string[]
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (user: User) => void
  logout: () => Promise<void>
  refetch: () => Promise<void>
  hasRole: (role: string) => boolean
  hasPermission: (perm: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper to read token from cookie
function getTokenFromCookie(name: string): string | null {
  if (typeof window === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : null
}

// Helper to parse JWT payload
function getUserFromToken(): User | null {
  try {
    const token = getTokenFromCookie('access_token')
    if (!token) return null
    const payloadBase64 = token.split('.')[1]
    const decoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload: any = JSON.parse(decoded)
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    } as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize user from token on mount
  useEffect(() => {
    const initUser = getUserFromToken()
    setUser(initUser)
    setLoading(false)
  }, [])

  const login = useCallback((userData: User) => {
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getTokenFromCookie('refresh_token')
    try {
      await authApi.logout(refreshToken || undefined)
    } catch {
      // Ignore logout API errors, still clear local state
    }
    // Clear tokens from both cookie and localStorage (for cleanup)
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    setUser(null)
  }, [])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authApi.me()
      setUser(data)
    } catch {
      // Fallback to token payload if API fails
      const fallback = getUserFromToken()
      setUser(fallback || null)
    } finally {
      setLoading(false)
    }
  }, [])

  const hasRole = useCallback((role: string) => user?.roles?.includes(role) ?? false, [user])
  const hasPermission = useCallback((perm: string) => user?.permissions?.includes(perm) ?? false, [user])

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refetch,
    hasRole,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
