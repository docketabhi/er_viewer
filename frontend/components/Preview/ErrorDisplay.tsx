'use client';

import { useMemo } from 'react';

/**
 * Parsed error information from Mermaid error messages.
 */
export interface ParsedError {
  /** The main error message */
  message: string;
  /** Extracted line number (if available) */
  line?: number;
  /** Extracted column number (if available) */
  column?: number;
  /** The problematic token or text (if available) */
  token?: string;
  /** Expected tokens or syntax (if available) */
  expected?: string[];
  /** The original raw error message */
  raw: string;
}

/**
 * Props for the ErrorDisplay component.
 */
export interface ErrorDisplayProps {
  /** The error to display */
  error: Error | null;
  /** Optional title for the error display */
  title?: string;
  /** Optional CSS class for the container */
  className?: string;
  /** The source code being parsed (used to show context) */
  source?: string;
}

/**
 * Parse a Mermaid error message to extract structured information.
 * Mermaid errors often contain line/column info and expected tokens.
 *
 * Example Mermaid error formats:
 * - "Syntax error in text\nmermaid version 11.x.x\nParse error on line 3:\n...content...\n---------^"
 * - "Lexical error on line 2. Unrecognized text."
 * - "Parse error on line 5:\n...CUSTOMER ||--o{ ORDER : \"places\"\n-----------------------^\nExpecting 'NEWLINE', got 'EOF'"
 */
export function parseMermaidError(error: Error): ParsedError {
  const message = error.message;
  const result: ParsedError = {
    message: message,
    raw: message,
  };

  // Try to extract line number from various patterns
  // Pattern 1: "Parse error on line X:"
  const parseErrorMatch = message.match(/Parse error on line (\d+)/i);
  if (parseErrorMatch) {
    result.line = parseInt(parseErrorMatch[1], 10);
  }

  // Pattern 2: "Lexical error on line X"
  const lexicalErrorMatch = message.match(/Lexical error on line (\d+)/i);
  if (lexicalErrorMatch && !result.line) {
    result.line = parseInt(lexicalErrorMatch[1], 10);
  }

  // Pattern 3: "at line X" or "on line X"
  const lineMatch = message.match(/(?:at|on) line (\d+)/i);
  if (lineMatch && !result.line) {
    result.line = parseInt(lineMatch[1], 10);
  }

  // Pattern 4: Line:Column format "line X, column Y" or "line X:Y"
  const lineColMatch = message.match(/line (\d+)(?:,?\s*column\s*|\s*:\s*)(\d+)/i);
  if (lineColMatch) {
    result.line = parseInt(lineColMatch[1], 10);
    result.column = parseInt(lineColMatch[2], 10);
  }

  // Try to extract expected tokens
  // Pattern: "Expecting 'TOKEN1', 'TOKEN2', got 'TOKEN'"
  const expectingMatch = message.match(/Expecting\s+([^,]+(?:,\s*[^,]+)*),?\s*got\s+['"]?(\w+)['"]?/i);
  if (expectingMatch) {
    result.expected = expectingMatch[1]
      .split(',')
      .map(t => t.trim().replace(/['"]/g, ''));
    result.token = expectingMatch[2];
  }

  // Try to extract the problematic token from "Unrecognized text" errors
  const unrecognizedMatch = message.match(/Unrecognized text\.?\s*['"]?([^'"]+)['"]?/i);
  if (unrecognizedMatch && !result.token) {
    result.token = unrecognizedMatch[1];
  }

  // Clean up the main message by removing technical details
  let cleanMessage = message;

  // Remove "mermaid version X.X.X" line
  cleanMessage = cleanMessage.replace(/mermaid version \d+\.\d+\.\d+\n?/gi, '');

  // Extract just the first meaningful line if the error is multi-line
  const firstLine = cleanMessage.split('\n')[0].trim();
  if (firstLine && firstLine.length > 10) {
    result.message = firstLine;
  }

  return result;
}

/**
 * Get the line from source code at a given line number (1-indexed).
 */
function getSourceLine(source: string, lineNumber: number): string | undefined {
  const lines = source.split('\n');
  if (lineNumber > 0 && lineNumber <= lines.length) {
    return lines[lineNumber - 1];
  }
  return undefined;
}

/**
 * AlertCircle icon component for error display.
 */
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * ErrorDisplay component for showing Mermaid syntax errors in a user-friendly format.
 *
 * Features:
 * - Parses error messages to extract line numbers and context
 * - Displays the problematic source line if available
 * - Shows expected tokens for parse errors
 * - Provides actionable error information
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={new Error("Parse error on line 3: unexpected token")}
 *   source={mermaidSource}
 *   title="Diagram Syntax Error"
 * />
 * ```
 */
export function ErrorDisplay({
  error,
  title = 'Diagram Syntax Error',
  className = '',
  source,
}: ErrorDisplayProps) {
  // Parse the error message to extract structured information
  const parsedError = useMemo(() => {
    if (!error) return null;
    return parseMermaidError(error);
  }, [error]);

  // Get the problematic source line if we have line info and source
  const sourceLine = useMemo(() => {
    if (!parsedError?.line || !source) return undefined;
    return getSourceLine(source, parsedError.line);
  }, [parsedError, source]);

  if (!error || !parsedError) {
    return null;
  }

  return (
    <div
      className={`flex items-start justify-center h-full p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-lg w-full p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 text-destructive mt-0.5">
            <AlertCircleIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-destructive">
              {title}
            </h3>

            {/* Line and column info */}
            {parsedError.line && (
              <p className="mt-1 text-xs text-muted-foreground">
                {parsedError.column
                  ? `Line ${parsedError.line}, Column ${parsedError.column}`
                  : `Line ${parsedError.line}`}
              </p>
            )}

            {/* Main error message */}
            <p className="mt-2 text-sm text-foreground/80 break-words">
              {parsedError.message}
            </p>

            {/* Problematic source line */}
            {sourceLine && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Problematic code:
                </p>
                <pre className="text-xs bg-background/50 rounded p-2 overflow-x-auto font-mono text-destructive border border-destructive/10">
                  <code>{sourceLine}</code>
                </pre>
              </div>
            )}

            {/* Expected tokens */}
            {parsedError.expected && parsedError.expected.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">
                  Expected:{' '}
                  <span className="font-mono text-foreground/70">
                    {parsedError.expected.slice(0, 5).join(', ')}
                    {parsedError.expected.length > 5 && '...'}
                  </span>
                </p>
              </div>
            )}

            {/* Unexpected token */}
            {parsedError.token && (
              <p className="mt-1 text-xs text-muted-foreground">
                Got:{' '}
                <span className="font-mono text-destructive">
                  {parsedError.token}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;
