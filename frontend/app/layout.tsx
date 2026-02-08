import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ER Viewer - Mermaid Diagramming Tool',
  description: 'Create and visualize ER diagrams with nested block navigation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen overflow-hidden">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
