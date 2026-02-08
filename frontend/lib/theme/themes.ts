/**
 * Theme definitions for ER Viewer application.
 *
 * This module provides centralized theme configurations for:
 * - Application UI theming (CSS variables)
 * - Monaco Editor themes
 * - Mermaid diagram themes
 *
 * Theme preferences are managed by ThemeContext and persisted
 * to localStorage for a consistent user experience.
 */

import type { MermaidTheme } from '@/lib/mermaid/config';

/**
 * Application theme modes.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved theme (actual visual theme being applied).
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Monaco Editor theme names.
 */
export type MonacoTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';

/**
 * Application color palette with CSS variable references.
 */
export interface ThemeColors {
  /** Background color */
  background: string;
  /** Foreground/text color */
  foreground: string;
  /** Primary accent color */
  primary: string;
  /** Primary foreground (text on primary) */
  primaryForeground: string;
  /** Secondary background */
  secondary: string;
  /** Secondary foreground */
  secondaryForeground: string;
  /** Muted background */
  muted: string;
  /** Muted foreground */
  mutedForeground: string;
  /** Accent background */
  accent: string;
  /** Accent foreground */
  accentForeground: string;
  /** Border color */
  border: string;
}

/**
 * Complete theme configuration.
 */
export interface ThemeConfig {
  /** Theme identifier */
  id: ResolvedTheme;
  /** Display name */
  name: string;
  /** Monaco editor theme */
  monacoTheme: MonacoTheme;
  /** Mermaid diagram theme */
  mermaidTheme: MermaidTheme;
  /** CSS color palette */
  colors: ThemeColors;
}

/**
 * Light theme configuration.
 */
export const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Light',
  monacoTheme: 'vs',
  mermaidTheme: 'default',
  colors: {
    background: '#ffffff',
    foreground: '#171717',
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    accent: '#f4f4f5',
    accentForeground: '#18181b',
    border: '#e4e4e7',
  },
};

/**
 * Dark theme configuration.
 */
export const darkTheme: ThemeConfig = {
  id: 'dark',
  name: 'Dark',
  monacoTheme: 'vs-dark',
  mermaidTheme: 'dark',
  colors: {
    background: '#0a0a0a',
    foreground: '#ededed',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#27272a',
    secondaryForeground: '#fafafa',
    muted: '#27272a',
    mutedForeground: '#a1a1aa',
    accent: '#27272a',
    accentForeground: '#fafafa',
    border: '#3f3f46',
  },
};

/**
 * Theme registry mapping theme IDs to configurations.
 */
export const themes: Record<ResolvedTheme, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

/**
 * Gets the theme configuration for a resolved theme.
 *
 * @param theme - The resolved theme
 * @returns Theme configuration object
 *
 * @example
 * ```ts
 * const config = getThemeConfig('dark');
 * // config.monacoTheme === 'vs-dark'
 * ```
 */
export function getThemeConfig(theme: ResolvedTheme): ThemeConfig {
  return themes[theme];
}

/**
 * Gets the Monaco editor theme for a resolved app theme.
 *
 * @param theme - The resolved app theme
 * @returns Monaco theme name
 *
 * @example
 * ```ts
 * const monacoTheme = getMonacoTheme('dark'); // 'vs-dark'
 * ```
 */
export function getMonacoTheme(theme: ResolvedTheme): MonacoTheme {
  return themes[theme].monacoTheme;
}

/**
 * Gets the Mermaid theme for a resolved app theme.
 *
 * @param theme - The resolved app theme
 * @returns Mermaid theme name
 *
 * @example
 * ```ts
 * const mermaidTheme = getMermaidTheme('dark'); // 'dark'
 * ```
 */
export function getMermaidTheme(theme: ResolvedTheme): MermaidTheme {
  return themes[theme].mermaidTheme;
}

/**
 * CSS custom property names for theme colors.
 * These map to the CSS variables defined in globals.css.
 */
export const themeColorVars = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
} as const;

/**
 * Gets a CSS variable reference for a theme color.
 *
 * @param colorKey - The color key
 * @returns CSS var() reference string
 *
 * @example
 * ```ts
 * const bgColor = getCssVar('background'); // 'var(--background)'
 * ```
 */
export function getCssVar(colorKey: keyof typeof themeColorVars): string {
  return `var(${themeColorVars[colorKey]})`;
}

/**
 * Local storage key for theme persistence.
 */
export const THEME_STORAGE_KEY = 'er-viewer-theme';

/**
 * Default theme mode when no preference is stored.
 */
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

/**
 * Mermaid themes available for user selection.
 * Users can override the auto-selected theme with these options.
 */
export const availableMermaidThemes: Array<{
  id: MermaidTheme;
  name: string;
  description: string;
}> = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard blue theme, works well with light mode',
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Dark theme optimized for dark mode',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Green-tinted theme with natural colors',
  },
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'Gray-toned theme for minimal appearance',
  },
];

/**
 * Monaco Editor themes available for user selection.
 */
export const availableMonacoThemes: Array<{
  id: MonacoTheme;
  name: string;
  description: string;
}> = [
  {
    id: 'vs',
    name: 'Light',
    description: 'Visual Studio light theme',
  },
  {
    id: 'vs-dark',
    name: 'Dark',
    description: 'Visual Studio dark theme',
  },
  {
    id: 'hc-black',
    name: 'High Contrast Dark',
    description: 'High contrast dark theme for accessibility',
  },
  {
    id: 'hc-light',
    name: 'High Contrast Light',
    description: 'High contrast light theme for accessibility',
  },
];
