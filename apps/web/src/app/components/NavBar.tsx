'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function NavBar() {
  const [isDark, setIsDark] = useState(false)
  const { user, loading, hasPermission } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const el = document.documentElement
      isDark ? el.classList.add('dark') : el.classList.remove('dark')
    }
  }, [isDark])

  // Don't render nav links if not logged in
  if (loading) {
    return (
      <nav className="bg-gold border-b border-border px-4 py-2 flex justify-between items-center">
        <div />
        <button
          onClick={() => setIsDark(!isDark)}
          className="bg-gold text-white py-2 px-4 rounded hover:bg-goldDark transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >{isDark ? '☀️' : '🌙'}</button>
      </nav>
    )
  }

  return (
    <nav className="bg-gold border-b border-border px-4 py-2 flex justify-between items-center">
      <div>
        {user && hasPermission('operations:read') && (
          <Link href="/operations/dashboard" className="mr-4 text-black font-semibold">Operations</Link>
        )}
        {user && hasPermission('client:read') && (
          <Link href="/client/home" className="mr-4 text-black font-semibold">Client</Link>
        )}
        {user && hasPermission('games:read') && (
          <Link href="/games/lobby" className="text-black font-semibold">Games</Link>
        )}
      </div>
      <button
        onClick={() => setIsDark(!isDark)}
        className="bg-gold text-white py-2 px-4 rounded hover:bg-goldDark transition-colors"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >{isDark ? '☀️' : '🌙'}</button>
    </nav>
  )
}
