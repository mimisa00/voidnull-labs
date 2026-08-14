'use client'
import Link from 'next/link'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/context/theme-context'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

export default function NavBar() {
  const { choice, resolvedTheme, setChoice } = useTheme()
  const { user, loading, hasPermission } = useAuth()

  const getThemeIcon = () => {
    if (choice === 'system') {
      return <Monitor className="w-4 h-4" />
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="w-4 h-4" />
    ) : (
      <Sun className="w-4 h-4" />
    )
  }

  const handleThemeChange = (value: string) => {
    if (value === 'light' || value === 'dark' || value === 'system') {
      setChoice(value)
    }
  }

  // Don't render nav links if not logged in
  if (loading) {
    return (
      <nav className="bg-header border-b border-border px-4 py-3 flex justify-between items-center rounded-b-xl shadow-md">
        <div />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
              aria-label="Theme menu"
            >
              {getThemeIcon()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={choice} onValueChange={handleThemeChange}>
              <DropdownMenuRadioItem value="light">
                <Sun className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="w-4 h-4 mr-2" />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    )
  }

  return (
    <nav className="bg-header border-b border-border px-4 py-3 flex justify-between items-center rounded-b-xl shadow-md">
      <div className="flex gap-6">
        {user && hasPermission('operations:read') && (
          <Link
            href="/operations/dashboard"
            className="text-header-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Operations
          </Link>
        )}
        {user && hasPermission('client:read') && (
          <Link
            href="/client/home"
            className="text-header-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Client
          </Link>
        )}
        {user && hasPermission('games:read') && (
          <Link
            href="/games/lobby"
            className="text-header-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Games
          </Link>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
            aria-label="Theme menu"
          >
            {getThemeIcon()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={choice} onValueChange={handleThemeChange}>
            <DropdownMenuRadioItem value="light">
              <Sun className="w-4 h-4 mr-2" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="w-4 h-4 mr-2" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
