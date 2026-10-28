import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { defaultTheme, applyThemeToDOM } from '@/design-system/theme.config'
import type { ThemeMode } from '@/design-system/tokens'

// TYPES
interface ThemeProviderProps { children: ReactNode; defaultTheme?: ThemeMode; storageKey?: string }
interface ThemeProviderState { theme: ThemeMode; resolvedTheme: 'light' | 'dark'; setTheme: (theme: ThemeMode) => void }

// CONTEXT
const ThemeProviderContext = createContext<ThemeProviderState | null>(null)
const isTheme = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark' || value === 'system'
const readTheme = (storageKey: string, fallback: ThemeMode): ThemeMode => {
  try { const saved = localStorage.getItem(storageKey); return isTheme(saved) ? saved : fallback } catch { return fallback }
}

// COMPONENT
export const ThemeProvider = ({ children, defaultTheme: initialTheme = 'system', storageKey = 'elegantbarb-theme' }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme(storageKey, initialTheme))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const resolvedTheme = theme === 'system' ? systemDark ? 'dark' : 'light' : theme

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    applyThemeToDOM(defaultTheme, resolvedTheme)
    document.documentElement.style.colorScheme = resolvedTheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#101324' : '#FBFBFF')
  }, [resolvedTheme])

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === storageKey) setThemeState(isTheme(event.newValue) ? event.newValue : initialTheme)
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [storageKey, initialTheme])

  const setTheme = useCallback((next: ThemeMode) => {
    try { localStorage.setItem(storageKey, next) } catch { /* Preserve the preference for this session. */ }
    setThemeState(next)
  }, [storageKey])

  return <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider')
  return context
}
