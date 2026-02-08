import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ER Viewer - Mermaid Diagramming Tool',
  description: 'Create and visualize ER diagrams with nested block navigation',
};

/**
 * Script to apply theme before hydration to prevent FOUC (Flash of Unstyled Content).
 * This runs synchronously before the page renders to apply the persisted theme class.
 */
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('er-viewer-theme');
    var isDark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="antialiased min-h-screen overflow-hidden">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
