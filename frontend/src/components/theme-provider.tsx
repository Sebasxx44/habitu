import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { defaultTheme, applyThemeToDOM } from '@/design-system/theme.config'
import type { ThemeMode } from '@/design-system/tokens'
import { hasExplicitTheme, resolveAccountTheme, resolveThemePreference } from '@/design-system/themePreference'

// TYPES
interface ThemeProviderProps { children: ReactNode; defaultTheme?: ThemeMode; storageKey?: string }
interface ThemeProviderState { theme: ThemeMode; resolvedTheme: 'light' | 'dark'; setTheme: (theme: ThemeMode) => void; applyAccountTheme: (theme: ThemeMode) => void }

// CONTEXT
const ThemeProviderContext = createContext<ThemeProviderState | null>(null)
const readTheme = (storageKey: string, fallback: ThemeMode): ThemeMode => {
  try { return resolveThemePreference(localStorage.getItem(storageKey), localStorage.getItem(`${storageKey}-choice`), fallback) } catch { return fallback }
}

// COMPONENT
export const ThemeProvider = ({ children, defaultTheme: initialTheme = 'light', storageKey = 'elegantbarb-theme' }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme(storageKey, initialTheme))
  const chosenTheme = useRef<ThemeMode | null>(null)
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
      if (event.key === storageKey || event.key === `${storageKey}-choice` || event.key === null) {
        chosenTheme.current = null
        setThemeState(readTheme(storageKey, initialTheme))
      }
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [storageKey, initialTheme])

  const setTheme = useCallback((next: ThemeMode) => {
    chosenTheme.current = next
    try { localStorage.setItem(`${storageKey}-choice`, next); localStorage.setItem(storageKey, next) } catch { /* Preserve the preference for this session. */ }
    setThemeState(next)
  }, [storageKey])

  const applyAccountTheme = useCallback((next: ThemeMode) => {
    if (chosenTheme.current) { setThemeState(chosenTheme.current); return }
    try {
      const saved = localStorage.getItem(storageKey)
      const choice = localStorage.getItem(`${storageKey}-choice`)
      if (!hasExplicitTheme(saved, choice) && next === 'dark') {
        localStorage.setItem(`${storageKey}-choice`, next)
        localStorage.setItem(storageKey, next)
      }
      setThemeState(resolveAccountTheme(next, saved, choice))
    } catch { setThemeState(next === 'system' ? 'light' : next) }
  }, [storageKey])

  return <ThemeProviderContext.Provider value={{ theme, resolvedTheme, setTheme, applyAccountTheme }}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme debe utilizarse dentro de ThemeProvider')
  return context
}
