'use client';

import { memo, useCallback } from 'react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

/**
 * Props for the ThemeToggle component.
 */
export interface ThemeToggleProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show label text */
  showLabel?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Size configurations for the toggle button.
 */
const sizeConfig = {
  sm: {
    button: 'w-8 h-8',
    icon: 'w-4 h-4',
    text: 'text-xs',
  },
  md: {
    button: 'w-9 h-9',
    icon: 'w-5 h-5',
    text: 'text-sm',
  },
  lg: {
    button: 'w-10 h-10',
    icon: 'w-6 h-6',
    text: 'text-base',
  },
};

/**
 * Sun icon for light mode.
 */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
    </svg>
  );
}

/**
 * Moon icon for dark mode.
 */
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * ThemeToggle component for switching between light and dark modes.
 *
 * Features:
 * - Displays current theme with sun/moon icons
 * - Toggles between light and dark modes
 * - Keyboard accessible
 * - Uses ThemeContext for state management
 *
 * @example
 * ```tsx
 * <ThemeToggle size="md" />
 * ```
 */
export const ThemeToggle = memo(function ThemeToggle({
  size = 'md',
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const sizes = sizeConfig[size];

  const handleClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTheme();
      }
    },
    [toggleTheme]
  );

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        theme-toggle
        inline-flex items-center justify-center gap-2
        ${sizes.button}
        rounded-md
        text-muted-foreground
        hover:text-foreground hover:bg-muted
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
        transition-colors duration-150
        ${className}
      `}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <MoonIcon className={sizes.icon} />
      ) : (
        <SunIcon className={sizes.icon} />
      )}
      {showLabel && (
        <span className={sizes.text}>{isDark ? 'Dark' : 'Light'}</span>
      )}
    </button>
  );
});

export default ThemeToggle;
