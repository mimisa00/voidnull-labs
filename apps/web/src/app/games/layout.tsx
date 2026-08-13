'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { connectSocket, disconnectSocket } from '@/lib/socket'

const NAV = [
  { href: '/games/lobby', label: 'Lobby', icon: '🎮' },
  { href: '/games/blackjack', label: 'Blackjack', icon: '♠️' },
]

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated.
  useEffect(() => {
    if (!loading && !user) {
      const pathname =
        typeof window !== 'undefined' ? window.location.pathname : ''
      if (pathname !== '/login') router.push('/login')
    }
  }, [user, loading, router])

  // Setup websocket for real-time game updates.
  useEffect(() => {
    const socket = connectSocket()
    socket.on('notification', (data) => console.log('[WS] notification:', data))
    return () => {
      disconnectSocket()
    }
  }, [])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  if (!user) return null

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">Games</h1>
          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
