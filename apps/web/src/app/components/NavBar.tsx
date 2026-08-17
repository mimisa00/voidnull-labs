'use client'
import Link from 'next/link'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/context/theme-context'
import { useRef, useState, useEffect } from 'react'
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTimeRef = useRef<number | null>(null)
  const isLastInteractionTouchRef = useRef(false)
  const touchInteractionResetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const navRef = useRef<HTMLElement>(null)

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

  const clearCollapseTimeout = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current)
      collapseTimeoutRef.current = null
    }
  }

  const clearAutoCollapseTimeout = () => {
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current)
      autoCollapseTimeoutRef.current = null
    }
  }

  const clearTouchInteractionResetTimeout = () => {
    if (touchInteractionResetTimeoutRef.current) {
      clearTimeout(touchInteractionResetTimeoutRef.current)
      touchInteractionResetTimeoutRef.current = null
    }
  }

  const expand = () => {
    clearCollapseTimeout()
    clearAutoCollapseTimeout()
    setIsExpanded(true)
    // Auto-collapse after 5 seconds of inactivity (touch only)
    if (isLastInteractionTouchRef.current) {
      autoCollapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false)
      }, 5000)
    }
  }

  const scheduleCollapse = () => {
    clearCollapseTimeout()
    collapseTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 300)
  }

  const handleMouseEnter = () => {
    // Only respond to mouse if last interaction wasn't touch
    if (!isLastInteractionTouchRef.current) {
      expand()
    }
  }

  const handleMouseLeave = () => {
    if (!isLastInteractionTouchRef.current) {
      scheduleCollapse()
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0]
    touchStartYRef.current = touch.clientY
    touchStartTimeRef.current = Date.now()
    isLastInteractionTouchRef.current = true
    // Clear any existing reset timeout and set a new one
    clearTouchInteractionResetTimeout()
    touchInteractionResetTimeoutRef.current = setTimeout(() => {
      isLastInteractionTouchRef.current = false
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (touchStartYRef.current === null) return

    const touch = e.touches[0]
    const deltaY = touch.clientY - touchStartYRef.current

    // Expand: touch started near top (< 50px) and moved down > 30px
    if (touchStartYRef.current < 50 && deltaY > 30 && !isExpanded) {
      expand()
      e.preventDefault()
    }

    // Collapse: if already expanded, moved up > 20px
    if (isExpanded && deltaY < -20) {
      setIsExpanded(false)
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    touchStartYRef.current = null
    touchStartTimeRef.current = null
  }

  const handleFocus = () => {
    if (!isExpanded) {
      expand()
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    // Only collapse if focus is truly leaving the nav container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      scheduleCollapse()
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    // Don't collapse if dropdown menu is open
    if (isDropdownOpen) {
      return
    }
    if (navRef.current && !navRef.current.contains(e.target as Node)) {
      if (isExpanded) {
        setIsExpanded(false)
      }
    }
  }

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isExpanded])

  useEffect(() => {
    return () => {
      clearCollapseTimeout()
      clearAutoCollapseTimeout()
      clearTouchInteractionResetTimeout()
    }
  }, [])

  const navContent = (
    <>
      <div className="flex gap-6">
        {user && hasPermission('operations:read') && (
          <Link
            href="/operations/dashboard"
            className="text-header-glass-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Operations
          </Link>
        )}
        {user && hasPermission('client:read') && (
          <Link
            href="/client/home"
            className="text-header-glass-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Client
          </Link>
        )}
        {user && hasPermission('games:read') && (
          <Link
            href="/games/lobby"
            className="text-header-glass-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            Games
          </Link>
        )}
      </div>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
            aria-label="Theme menu"
          >
            {getThemeIcon()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={choice}
            onValueChange={handleThemeChange}
          >
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
    </>
  )

  // Don't render nav links if not logged in
  if (loading) {
    return (
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 ${
          isExpanded
            ? 'bg-header-glass/75 backdrop-blur-lg'
            : 'bg-header-glass/50 backdrop-blur-sm'
        } border-b border-border px-4 rounded-b-xl shadow-md transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[100px]' : 'max-h-[4px]'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-expanded={isExpanded}
      >
        <div className="py-3 flex justify-between items-center">
          <div />
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 bg-primary hover:bg-accent text-primary-foreground py-2 px-4 rounded-full transition-colors"
                aria-label="Theme menu"
              >
                {getThemeIcon()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={choice}
                onValueChange={handleThemeChange}
              >
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
        </div>
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 ${
        isExpanded
          ? 'bg-header-glass/75 backdrop-blur-lg'
          : 'bg-header-glass/50 backdrop-blur-sm'
      } border-b border-border px-4 rounded-b-xl shadow-md transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[100px]' : 'max-h-[4px]'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-expanded={isExpanded}
    >
      <div className="py-3 flex justify-between items-center">{navContent}</div>
    </nav>
  )
}
