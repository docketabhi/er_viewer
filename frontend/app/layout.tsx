import type { Metadata } from 'next';
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
