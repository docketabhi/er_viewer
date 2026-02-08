'use client';

import dynamic from 'next/dynamic';
import type { OnChange, OnMount } from '@monaco-editor/react';
import { useCallback, useState } from 'react';

/**
 * Dynamically import Monaco Editor with SSR disabled.
 * This is REQUIRED because Monaco requires browser APIs (navigator, window)
 * that are not available during server-side rendering.
 */
const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    )
  }
);

export interface MonacoEditorProps {
  /** The current value of the editor */
  value: string;
  /** Callback fired when the editor content changes */
  onChange?: (value: string | undefined) => void;
  /** Editor theme - 'vs-dark' or 'light' */
  theme?: 'vs-dark' | 'light';
  /** CSS height of the editor */
  height?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback fired when the editor is mounted */
  onMount?: OnMount;
}

/**
 * Monaco Editor wrapper component for editing Mermaid diagrams.
 *
 * Uses dynamic import with ssr: false to prevent "navigator is not defined" errors
 * during Next.js server-side rendering.
 *
 * @example
 * ```tsx
 * <MonacoEditor
 *   value={mermaidSource}
 *   onChange={(value) => setMermaidSource(value ?? '')}
 *   theme="vs-dark"
 * />
 * ```
 */
export function MonacoEditor({
  value,
  onChange,
  theme = 'vs-dark',
  height = '100%',
  readOnly = false,
  onMount,
}: MonacoEditorProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    setIsLoading(false);

    // Configure editor settings for better Mermaid editing experience
    editor.updateOptions({
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
    });

    // Call user's onMount callback if provided
    onMount?.(editor, monaco);
  }, [onMount]);

  const handleChange: OnChange = useCallback((newValue) => {
    onChange?.(newValue);
  }, [onChange]);

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-muted-foreground">Initializing editor...</div>
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage="plaintext"
        language="plaintext"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme={theme}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          fontSize: 14,
        }}
      />
    </div>
  );
}

export default MonacoEditor;
