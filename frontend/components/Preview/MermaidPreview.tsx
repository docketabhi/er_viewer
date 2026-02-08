'use client';

import { useEffect, useRef, useState, useCallback, useId } from 'react';
import {
  type MermaidTheme,
  createMermaidConfig,
  getThemeForMode,
} from '@/lib/mermaid/config';
import { useDebounce } from '@/hooks/useDebounce';
import { ErrorDisplay } from './ErrorDisplay';

/** Default debounce delay for preview updates in milliseconds */
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Props for the MermaidPreview component.
 */
export interface MermaidPreviewProps {
  /** The Mermaid source code to render */
  source: string;
  /** Optional Mermaid theme override */
  theme?: MermaidTheme;
  /** Whether the app is in dark mode (used to auto-select theme) */
  isDarkMode?: boolean;
  /** Callback fired when rendering completes successfully */
  onRenderSuccess?: (svg: string) => void;
  /** Callback fired when rendering fails */
  onRenderError?: (error: Error) => void;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * Render state for tracking the component's status.
 */
interface RenderState {
  status: 'idle' | 'loading' | 'success' | 'error';
  svg: string | null;
  error: Error | null;
}

/**
 * MermaidPreview component renders Mermaid diagrams as SVG.
 *
 * Uses dynamic import of Mermaid.js to ensure it only loads in the browser,
 * preventing SSR issues. The component uses mermaid.render() API (not the
 * deprecated mermaid.init()) for rendering.
 *
 * @example
 * ```tsx
 * <MermaidPreview
 *   source={`erDiagram
 *     CUSTOMER ||--o{ ORDER : places
 *   `}
 *   theme="dark"
 *   onRenderError={(error) => console.error(error)}
 * />
 * ```
 */
export function MermaidPreview({
  source,
  theme,
  isDarkMode = false,
  onRenderSuccess,
  onRenderError,
  className = '',
}: MermaidPreviewProps) {
  // Generate a unique ID for this component instance
  const componentId = useId();
  const containerId = `mermaid-preview-${componentId.replace(/:/g, '-')}`;

  // Debounce source changes for performance (prevents flicker during typing)
  const debouncedSource = useDebounce(source, PREVIEW_DEBOUNCE_MS);

  // Refs for DOM access
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<typeof import('mermaid') | null>(null);

  // Render state
  const [renderState, setRenderState] = useState<RenderState>({
    status: 'idle',
    svg: null,
    error: null,
  });

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Determine the effective theme
  const effectiveTheme = theme ?? getThemeForMode(isDarkMode);

  /**
   * Initialize Mermaid with configuration.
   * Only runs once when mermaid module is first loaded.
   */
  const initializeMermaid = useCallback(
    async (mermaid: typeof import('mermaid').default) => {
      const config = createMermaidConfig({ theme: effectiveTheme });
      mermaid.initialize(config);
    },
    [effectiveTheme]
  );

  /**
   * Render the Mermaid diagram from debounced source.
   * Uses mermaid.render() API for rendering.
   * Debouncing prevents excessive re-renders during rapid typing.
   */
  const renderDiagram = useCallback(async () => {
    // Skip if no source or already loading
    if (!debouncedSource.trim()) {
      setRenderState({
        status: 'idle',
        svg: null,
        error: null,
      });
      return;
    }

    setRenderState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    try {
      // Dynamically import mermaid to avoid SSR issues
      if (!mermaidRef.current) {
        mermaidRef.current = await import('mermaid');
      }

      const mermaid = mermaidRef.current.default;

      // Re-initialize with current theme settings
      await initializeMermaid(mermaid);

      // Generate a unique ID for this render call
      const renderId = `mermaid-render-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Use mermaid.render() API (not deprecated init())
      const { svg, bindFunctions } = await mermaid.render(renderId, debouncedSource);

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      // Update state with rendered SVG
      setRenderState({
        status: 'success',
        svg,
        error: null,
      });

      // Call success callback
      onRenderSuccess?.(svg);

      // If container exists, insert SVG and bind any interactive functions
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        // Mermaid's bindFunctions attaches click handlers for interactive diagrams
        bindFunctions?.(containerRef.current);
      }
    } catch (err) {
      // Check if component is still mounted
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));

      setRenderState({
        status: 'error',
        svg: null,
        error,
      });

      // Call error callback
      onRenderError?.(error);
    }
  }, [debouncedSource, initializeMermaid, onRenderSuccess, onRenderError]);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Re-render when debounced source or theme changes
  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Render loading state
  if (renderState.status === 'loading') {
    return (
      <div
        className={`flex items-center justify-center h-full bg-background ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  // Render error state using the ErrorDisplay component
  if (renderState.status === 'error') {
    return (
      <ErrorDisplay
        error={renderState.error}
        source={debouncedSource}
        title="Diagram Syntax Error"
        className={className}
      />
    );
  }

  // Render idle state (no source)
  if (renderState.status === 'idle' || !renderState.svg) {
    return (
      <div
        className={`flex items-center justify-center h-full bg-background ${className}`}
      >
        <div className="text-muted-foreground text-sm text-center p-4">
          <p>Enter a Mermaid diagram to see the preview</p>
          <p className="text-xs mt-1 opacity-75">
            Supported: erDiagram, flowchart, sequenceDiagram, and more
          </p>
        </div>
      </div>
    );
  }

  // Render success state with SVG
  return (
    <div
      id={containerId}
      ref={containerRef}
      className={`mermaid-preview flex items-center justify-center h-full p-4 overflow-auto bg-background ${className}`}
      // Set SVG directly in case containerRef wasn't updated
      dangerouslySetInnerHTML={{ __html: renderState.svg }}
    />
  );
}

export default MermaidPreview;
