'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DiagramProvider } from '@/contexts/DiagramContext';
import { GlobalCommandPalette } from '@/components/CommandPalette';

/**
 * Props for the Providers component.
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers component wraps all context providers for the application.
 *
 * This component is a client component that provides:
 * - ThemeProvider for light/dark mode management
 * - DiagramProvider for diagram state and navigation
 * - GlobalCommandPalette for Cmd+Shift+P command launcher
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { Providers } from './providers';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Providers>{children}</Providers>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" persist>
      <DiagramProvider>
        {children}
        <GlobalCommandPalette />
      </DiagramProvider>
    </ThemeProvider>
  );
}

export default Providers;
