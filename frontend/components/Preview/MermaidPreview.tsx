'use client';

import { useEffect, useRef, useState, useCallback, useId } from 'react';
import {
  type MermaidTheme,
  createMermaidConfig,
  getThemeForMode,
} from '@/lib/mermaid/config';
import {
  type BlockDirective,
  type ProcessedSvg,
  processSvg,
  applyEntityHoverStyles,
  cleanupEntityHandlers,
} from '@/lib/mermaid/svgProcessor';
import { useDebounce } from '@/hooks/useDebounce';
import { usePanZoom, type Transform } from '@/hooks/usePanZoom';
import { ErrorDisplay } from './ErrorDisplay';
import { CanvasControls } from './CanvasControls';

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
  /** Callback fired when an entity is clicked */
  onEntityClick?: (entityName: string, event: MouseEvent) => void;
  /** Callback fired when an entity is right-clicked */
  onEntityContextMenu?: (entityName: string, event: MouseEvent) => void;
  /** Callback fired when a block badge is clicked for navigation */
  onBlockClick?: (block: BlockDirective, event: MouseEvent) => void;
  /** Callback fired when mouse enters an entity */
  onEntityMouseEnter?: (entityName: string, event: MouseEvent) => void;
  /** Callback fired when mouse leaves an entity */
  onEntityMouseLeave?: (entityName: string, event: MouseEvent) => void;
  /** Callback fired after SVG is processed with entity info */
  onSvgProcessed?: (processedSvg: ProcessedSvg) => void;
  /** Whether to add visual indicators for entities with blocks */
  showBlockIndicators?: boolean;
  /** Whether to enable pan and zoom controls (default: true) */
  enablePanZoom?: boolean;
  /** Whether to show canvas controls for zoom (default: true) */
  showControls?: boolean;
  /** Position of the canvas controls */
  controlsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Callback fired when transform changes */
  onTransformChange?: (transform: Transform) => void;
  /** Initial transform state */
  initialTransform?: Partial<Transform>;
  /** Minimum zoom scale (default: 0.1) */
  minScale?: number;
  /** Maximum zoom scale (default: 5) */
  maxScale?: number;
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
  onEntityClick,
  onEntityContextMenu,
  onBlockClick,
  onEntityMouseEnter,
  onEntityMouseLeave,
  onSvgProcessed,
  showBlockIndicators = true,
  enablePanZoom = true,
  showControls = true,
  controlsPosition = 'bottom-right',
  onTransformChange,
  initialTransform,
  minScale = 0.1,
  maxScale = 5,
  className = '',
}: MermaidPreviewProps) {
  // Generate a unique ID for this component instance
  const componentId = useId();
  const containerId = `mermaid-preview-${componentId.replace(/:/g, '-')}`;

  // Debounce source changes for performance (prevents flicker during typing)
  const debouncedSource = useDebounce(source, PREVIEW_DEBOUNCE_MS);

  // Refs for DOM access
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<typeof import('mermaid') | null>(null);

  // Pan and zoom state
  const {
    transform,
    isPanning,
    zoomIn,
    zoomOut,
    reset,
    fitToContainer,
    handleWheel,
    handleMouseDown,
    transformStyle,
    bindToContainer,
  } = usePanZoom({
    minScale,
    maxScale,
    initialTransform,
    enablePan: enablePanZoom,
    enableZoom: enablePanZoom,
    onTransformChange,
  });

  // Bind pan/zoom to wrapper container
  useEffect(() => {
    if (wrapperRef.current) {
      bindToContainer(wrapperRef);
    }
  }, [bindToContainer]);

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
        // Clean up previous handlers before inserting new SVG
        cleanupEntityHandlers(containerRef.current);

        containerRef.current.innerHTML = svg;
        // Mermaid's bindFunctions attaches click handlers for interactive diagrams
        bindFunctions?.(containerRef.current);

        // Post-process SVG to identify entity nodes and attach handlers
        const processedSvg = processSvg(containerRef.current, debouncedSource, {
          onEntityClick,
          onEntityContextMenu,
          onBlockClick,
          onEntityMouseEnter,
          onEntityMouseLeave,
          addBlockIndicators: showBlockIndicators,
        });

        // Apply hover styles for better UX
        applyEntityHoverStyles(containerRef.current);

        // Notify parent of processed SVG
        onSvgProcessed?.(processedSvg);
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
  }, [
    debouncedSource,
    initializeMermaid,
    onRenderSuccess,
    onRenderError,
    onEntityClick,
    onEntityContextMenu,
    onBlockClick,
    onEntityMouseEnter,
    onEntityMouseLeave,
    onSvgProcessed,
    showBlockIndicators,
  ]);

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

  // Handle wheel event for zooming
  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      if (enablePanZoom) {
        handleWheel(event);
      }
    },
    [enablePanZoom, handleWheel]
  );

  // Handle mouse down for panning
  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (enablePanZoom) {
        handleMouseDown(event);
      }
    },
    [enablePanZoom, handleMouseDown]
  );

  // Render success state with SVG
  return (
    <div
      id={containerId}
      ref={wrapperRef}
      className={`mermaid-preview relative h-full overflow-hidden bg-background ${className}`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      style={{ cursor: isPanning ? 'grabbing' : enablePanZoom ? 'grab' : 'default' }}
    >
      {/* Transformable SVG container */}
      <div
        ref={svgContainerRef}
        className="flex items-center justify-center w-full h-full p-4"
        style={{
          transform: enablePanZoom ? transformStyle : undefined,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* SVG content container */}
        <div
          ref={containerRef}
          className="mermaid-svg-content"
          dangerouslySetInnerHTML={{ __html: renderState.svg }}
        />
      </div>

      {/* Canvas controls for zoom */}
      {enablePanZoom && showControls && (
        <CanvasControls
          scale={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={reset}
          onFitToContainer={fitToContainer}
          minScale={minScale}
          maxScale={maxScale}
          position={controlsPosition}
          showScale
        />
      )}
    </div>
  );
}

export default MermaidPreview;
