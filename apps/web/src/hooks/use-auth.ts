'use client'

import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/auth-context'

export function useAuth() {
  const router = useRouter()
  const { user, loading, logout: contextLogout, hasRole, hasPermission, refetch } = useAuthContext()

  const logout = async () => {
    await contextLogout()
    router.push('/login')
  }

  return { user, loading, logout, hasRole, hasPermission, refetch }
}
