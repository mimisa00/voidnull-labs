'use client'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/context/theme-context'

export default function NavBar() {
  const { theme, toggleTheme } = useTheme()
  const { user, loading, hasPermission } = useAuth()

  // Don't render nav links if not logged in
  if (loading) {
    return (
      <nav className="bg-primary border-b border-border px-4 py-3 flex justify-between items-center rounded-b-xl shadow-md">
        <div />
        <button
          onClick={toggleTheme}
          className="bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
          aria-label={
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    )
  }

  return (
    <nav className="bg-primary border-b border-border px-4 py-3 flex justify-between items-center rounded-b-xl shadow-md">
      <div className="flex gap-6">
        {user && hasPermission('operations:read') && (
          <Link
            href="/operations/dashboard"
            className="text-primary-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Operations
          </Link>
        )}
        {user && hasPermission('client:read') && (
          <Link
            href="/client/home"
            className="text-primary-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Client
          </Link>
        )}
        {user && hasPermission('games:read') && (
          <Link
            href="/games/lobby"
            className="text-primary-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Games
          </Link>
        )}
      </div>
      <button
        onClick={toggleTheme}
        className="bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
        aria-label={
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        }
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}
