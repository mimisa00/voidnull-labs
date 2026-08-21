'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { connectSocket, disconnectSocket } from '@/lib/socket'

const NAV = [
  { href: '/games/lobby', label: 'Lobby', icon: '🎮' },
  { href: '/games/blackjack', label: 'Blackjack', icon: '♠️' },
  { href: '/tournaments', label: 'Tournaments', icon: '🏆' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '📊' },
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
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-secondary shadow-sm flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Games</h1>
          <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-primary/20 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg"
          >
            🚪 Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
