/**
 * Theme module exports.
 *
 * @example
 * ```ts
 * import { getThemeConfig, getMermaidTheme, lightTheme } from '@/lib/theme';
 * ```
 */

export {
  // Types
  type ThemeMode,
  type ResolvedTheme,
  type MonacoTheme,
  type ThemeColors,
  type ThemeConfig,
  // Theme configurations
  lightTheme,
  darkTheme,
  themes,
  // Functions
  getThemeConfig,
  getMonacoTheme,
  getMermaidTheme,
  getCssVar,
  // Constants
  themeColorVars,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_MODE,
  availableMermaidThemes,
  availableMonacoThemes,
} from './themes';
