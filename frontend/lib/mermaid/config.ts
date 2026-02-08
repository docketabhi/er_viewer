/**
 * Mermaid configuration utilities.
 *
 * Provides centralized configuration for Mermaid rendering,
 * ensuring consistent settings across the application.
 */

import type { MermaidConfig } from 'mermaid';

/**
 * Available Mermaid themes.
 * - auto: Automatically select based on app theme (light/dark)
 * - default: Standard light theme
 * - dark: Dark theme for dark mode
 * - forest: Green-tinted theme
 * - neutral: Gray-toned theme
 */
export type MermaidTheme = 'auto' | 'default' | 'dark' | 'forest' | 'neutral';

/**
 * Mermaid themes that can be directly applied (excludes 'auto').
 */
export type AppliedMermaidTheme = Exclude<MermaidTheme, 'auto'>;

/**
 * Configuration options for the MermaidPreview component.
 */
export interface MermaidPreviewConfig {
  /** The Mermaid theme to use (must be an applied theme, not 'auto') */
  theme: AppliedMermaidTheme;
  /** Whether to enable secure mode (disables script execution) */
  secureMode?: boolean;
  /** Custom font family for diagram text */
  fontFamily?: string;
  /** Base font size in pixels */
  fontSize?: number;
}

/**
 * Default configuration for Mermaid rendering.
 */
export const DEFAULT_MERMAID_CONFIG: MermaidPreviewConfig = {
  theme: 'default',
  secureMode: true,
  fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
  fontSize: 14,
};

/**
 * Creates a Mermaid configuration object from preview config.
 *
 * @param config - Preview configuration options
 * @returns Mermaid configuration object for mermaid.initialize()
 */
export function createMermaidConfig(
  config: Partial<MermaidPreviewConfig> = {}
): MermaidConfig {
  const mergedConfig = { ...DEFAULT_MERMAID_CONFIG, ...config };

  return {
    // Enable startup warnings but don't block rendering
    startOnLoad: false,
    // Theme configuration
    theme: mergedConfig.theme,
    // Security settings
    securityLevel: mergedConfig.secureMode ? 'strict' : 'loose',
    // Typography settings
    fontFamily: mergedConfig.fontFamily,
    // ER diagram specific settings
    er: {
      diagramPadding: 20,
      layoutDirection: 'TB',
      minEntityWidth: 100,
      minEntityHeight: 75,
      entityPadding: 15,
      stroke: 'gray',
      fill: 'honeydew',
      fontSize: mergedConfig.fontSize || 12,
      useMaxWidth: true,
    },
    // Flowchart specific settings (for future use)
    flowchart: {
      diagramPadding: 8,
      htmlLabels: true,
      curve: 'basis',
    },
    // Sequence diagram settings (for future use)
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      useMaxWidth: true,
    },
    // Theme variables for custom styling
    themeVariables: getThemeVariables(mergedConfig.theme),
  };
}

/**
 * Gets theme-specific variable overrides for Mermaid.
 *
 * @param theme - The applied Mermaid theme (not 'auto')
 * @returns Theme variables object
 */
function getThemeVariables(theme: AppliedMermaidTheme): Record<string, string> {
  switch (theme) {
    case 'dark':
      return {
        primaryColor: '#6366f1',
        primaryTextColor: '#f9fafb',
        primaryBorderColor: '#4f46e5',
        lineColor: '#9ca3af',
        secondaryColor: '#374151',
        tertiaryColor: '#1f2937',
        background: '#111827',
        mainBkg: '#1f2937',
        nodeBorder: '#6366f1',
        clusterBkg: '#374151',
        clusterBorder: '#4b5563',
        titleColor: '#f9fafb',
        edgeLabelBackground: '#374151',
      };
    case 'forest':
      return {
        primaryColor: '#16a34a',
        primaryTextColor: '#f9fafb',
        primaryBorderColor: '#15803d',
        lineColor: '#6b7280',
        secondaryColor: '#dcfce7',
        tertiaryColor: '#f0fdf4',
        background: '#ffffff',
        mainBkg: '#dcfce7',
        nodeBorder: '#16a34a',
        clusterBkg: '#f0fdf4',
        clusterBorder: '#86efac',
        titleColor: '#166534',
        edgeLabelBackground: '#dcfce7',
      };
    case 'neutral':
      return {
        primaryColor: '#6b7280',
        primaryTextColor: '#111827',
        primaryBorderColor: '#4b5563',
        lineColor: '#9ca3af',
        secondaryColor: '#e5e7eb',
        tertiaryColor: '#f3f4f6',
        background: '#ffffff',
        mainBkg: '#f3f4f6',
        nodeBorder: '#6b7280',
        clusterBkg: '#e5e7eb',
        clusterBorder: '#d1d5db',
        titleColor: '#1f2937',
        edgeLabelBackground: '#e5e7eb',
      };
    case 'default':
    default:
      return {
        primaryColor: '#3b82f6',
        primaryTextColor: '#111827',
        primaryBorderColor: '#2563eb',
        lineColor: '#6b7280',
        secondaryColor: '#dbeafe',
        tertiaryColor: '#eff6ff',
        background: '#ffffff',
        mainBkg: '#eff6ff',
        nodeBorder: '#3b82f6',
        clusterBkg: '#dbeafe',
        clusterBorder: '#93c5fd',
        titleColor: '#1e40af',
        edgeLabelBackground: '#dbeafe',
      };
  }
}

/**
 * Maps application theme (light/dark) to appropriate Mermaid theme.
 *
 * @param isDarkMode - Whether the app is in dark mode
 * @returns Appropriate Mermaid theme
 */
export function getThemeForMode(isDarkMode: boolean): AppliedMermaidTheme {
  return isDarkMode ? 'dark' : 'default';
}

/**
 * Resolves a Mermaid theme preference to an applied theme.
 *
 * When the theme is 'auto', it resolves to 'default' or 'dark' based on
 * the current app theme mode. Otherwise, returns the specified theme.
 *
 * @param theme - The user's theme preference
 * @param isDarkMode - Whether the app is in dark mode
 * @returns The resolved theme to apply
 *
 * @example
 * ```ts
 * // User selected 'auto', app is in dark mode
 * resolveMermaidTheme('auto', true); // 'dark'
 *
 * // User selected 'forest', any mode
 * resolveMermaidTheme('forest', true); // 'forest'
 * ```
 */
export function resolveMermaidTheme(
  theme: MermaidTheme,
  isDarkMode: boolean
): AppliedMermaidTheme {
  if (theme === 'auto') {
    return getThemeForMode(isDarkMode);
  }
  return theme;
}
