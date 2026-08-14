'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Helper to safely read from localStorage
function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    // localStorage not available (private mode, etc.)
    return null
  }
}

// Helper to safely write to localStorage
function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // localStorage not available - silently fail, theme still works client-side
  }
}

// Helper to get system preference
function getSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  // Sync state with DOM on mount (inline script in layout already applied class)
  useEffect(() => {
    const stored = getStoredTheme()
    const currentTheme = stored || getSystemTheme()
    setTheme(currentTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement
    if (newTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setStoredTheme(newTheme)
    applyTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return default theme during SSR
    return { theme: 'light' as Theme, toggleTheme: () => {} }
  }
  return context
}
