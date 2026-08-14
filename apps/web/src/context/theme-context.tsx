'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  choice: ThemeChoice
  resolvedTheme: ResolvedTheme
  setChoice: (choice: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Helper to safely read from localStorage
function getStoredChoice(): ThemeChoice | null {
  try {
    const stored = localStorage.getItem('themeChoice')
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? (stored as ThemeChoice)
      : null
  } catch {
    // localStorage not available (private mode, etc.)
    return null
  }
}

// Helper to safely write to localStorage
function setStoredChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem('themeChoice', choice)
  } catch {
    // localStorage not available - silently fail, theme still works client-side
  }
}

// Helper to get system preference
function getSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

// Helper to resolve choice to actual theme
function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'system') {
    return getSystemTheme()
  }
  return choice
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Initialize choice from localStorage on mount
  useEffect(() => {
    const stored = getStoredChoice()
    const initialChoice = stored || 'system'
    setChoiceState(initialChoice)

    const resolved = resolveTheme(initialChoice)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Manage mediaQuery listener based on current choice
  useEffect(() => {
    if (choice === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        const newResolved = getSystemTheme()
        setResolvedTheme(newResolved)
        applyTheme(newResolved)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // When choice is 'light' or 'dark', directly set resolvedTheme
      setResolvedTheme(choice)
      applyTheme(choice)
    }
  }, [choice])

  const applyTheme = (newTheme: ResolvedTheme) => {
    const html = document.documentElement
    if (newTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const setChoice = (newChoice: ThemeChoice) => {
    setChoiceState(newChoice)
    setStoredChoice(newChoice)
  }

  return (
    <ThemeContext.Provider value={{ choice, resolvedTheme, setChoice }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return default during SSR
    return {
      choice: 'system' as ThemeChoice,
      resolvedTheme: 'light' as ResolvedTheme,
      setChoice: () => {},
    }
  }
  return context
}
