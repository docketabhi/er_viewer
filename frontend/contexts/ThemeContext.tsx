'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

/**
 * Available theme options.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Resolved theme (actual theme being applied).
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme context value interface.
 */
export interface ThemeContextValue {
  /** Current theme preference (light, dark, or system) */
  theme: Theme;
  /** Resolved theme based on preference and system setting */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark modes */
  toggleTheme: () => void;
}

/**
 * Local storage key for persisting theme preference.
 */
const THEME_STORAGE_KEY = 'er-viewer-theme';

/**
 * Theme context with default values.
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Props for the ThemeProvider component.
 */
export interface ThemeProviderProps {
  /** Child components */
  children: ReactNode;
  /** Default theme (defaults to 'system') */
  defaultTheme?: Theme;
  /** Whether to persist theme to localStorage (defaults to true) */
  persist?: boolean;
}

/**
 * Get the system color scheme preference.
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Resolve the theme preference to an actual theme.
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply the theme to the document.
 */
function applyTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * ThemeProvider component for managing application theme.
 *
 * Provides theme context to child components and handles:
 * - Theme persistence via localStorage
 * - System theme detection and changes
 * - Automatic application of theme to document
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  persist = true,
}: ThemeProviderProps) {
  // Initialize theme from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    if (persist) {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    }
    return defaultTheme;
  });

  // Resolved theme state
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme)
  );

  /**
   * Set the theme preference.
   */
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (persist && typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      }
    },
    [persist]
  );

  /**
   * Toggle between light and dark modes.
   */
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const resolved = resolveTheme(theme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 *
 * @throws {Error} If used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme, resolvedTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

export default ThemeProvider;
