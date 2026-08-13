'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function ClientHome() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gold mb-2">Client Portal</h1>
          <p className="text-gray-600">Welcome to your personal dashboard</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="text-lg font-medium text-gray-900">{user.sub}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 mb-2">Roles</p>
              <div className="flex gap-2 flex-wrap">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <span key={role} className="inline-block bg-gold text-white px-3 py-1 rounded-full text-sm">
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-semibold text-gray-900">📊 Dashboard</p>
              <p className="text-sm text-gray-600 mt-1">View main dashboard</p>
            </a>
            <a
              href="/games/lobby"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-semibold text-gray-900">🎮 Games</p>
              <p className="text-sm text-gray-600 mt-1">Play games</p>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
