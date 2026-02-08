'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';

/**
 * Pan/zoom transform state.
 */
export interface Transform {
  /** X translation in pixels */
  x: number;
  /** Y translation in pixels */
  y: number;
  /** Zoom scale (1 = 100%) */
  scale: number;
}

/**
 * Configuration options for the usePanZoom hook.
 */
export interface UsePanZoomOptions {
  /** Minimum zoom scale (default: 0.1) */
  minScale?: number;
  /** Maximum zoom scale (default: 5) */
  maxScale?: number;
  /** Zoom factor per wheel step (default: 0.1) */
  zoomFactor?: number;
  /** Initial transform state */
  initialTransform?: Partial<Transform>;
  /** Whether panning is enabled (default: true) */
  enablePan?: boolean;
  /** Whether zooming is enabled (default: true) */
  enableZoom?: boolean;
  /** Callback fired when transform changes */
  onTransformChange?: (transform: Transform) => void;
}

/**
 * Return type for the usePanZoom hook.
 */
export interface UsePanZoomResult {
  /** Current transform state */
  transform: Transform;
  /** Whether user is currently panning */
  isPanning: boolean;
  /** Set transform directly */
  setTransform: (transform: Transform) => void;
  /** Zoom in by one step */
  zoomIn: () => void;
  /** Zoom out by one step */
  zoomOut: () => void;
  /** Reset to initial transform */
  reset: () => void;
  /** Zoom to a specific scale */
  zoomTo: (scale: number) => void;
  /** Fit content to container */
  fitToContainer: () => void;
  /** Handle wheel event for zooming */
  handleWheel: (event: WheelEvent | React.WheelEvent) => void;
  /** Handle mouse down for pan start */
  handleMouseDown: (event: MouseEvent | React.MouseEvent) => void;
  /** Handle mouse move for panning */
  handleMouseMove: (event: MouseEvent | React.MouseEvent) => void;
  /** Handle mouse up for pan end */
  handleMouseUp: () => void;
  /** CSS transform string for the current state */
  transformStyle: string;
  /** Bind handlers to a container element ref */
  bindToContainer: (ref: RefObject<HTMLElement | null>) => void;
}

/**
 * Default transform state.
 */
const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
};

/**
 * Default options for the hook.
 */
const DEFAULT_OPTIONS: Required<Omit<UsePanZoomOptions, 'onTransformChange' | 'initialTransform'>> = {
  minScale: 0.1,
  maxScale: 5,
  zoomFactor: 0.1,
  enablePan: true,
  enableZoom: true,
};

/**
 * Hook for managing pan and zoom interactions on a container element.
 *
 * Provides state management and event handlers for:
 * - Mouse wheel zooming (centered on cursor position)
 * - Mouse drag panning
 * - Programmatic zoom controls (zoom in, zoom out, reset, fit)
 *
 * @param options - Configuration options for pan/zoom behavior
 * @returns Pan/zoom state and handlers
 *
 * @example
 * ```tsx
 * function ZoomableCanvas() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const {
 *     transform,
 *     transformStyle,
 *     zoomIn,
 *     zoomOut,
 *     reset,
 *     bindToContainer,
 *   } = usePanZoom({ minScale: 0.5, maxScale: 3 });
 *
 *   useEffect(() => {
 *     bindToContainer(containerRef);
 *   }, [bindToContainer]);
 *
 *   return (
 *     <div ref={containerRef} style={{ overflow: 'hidden' }}>
 *       <div style={{ transform: transformStyle }}>
 *         {content}
 *       </div>
 *       <button onClick={zoomIn}>+</button>
 *       <button onClick={zoomOut}>-</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePanZoom(options: UsePanZoomOptions = {}): UsePanZoomResult {
  const {
    minScale = DEFAULT_OPTIONS.minScale,
    maxScale = DEFAULT_OPTIONS.maxScale,
    zoomFactor = DEFAULT_OPTIONS.zoomFactor,
    initialTransform,
    enablePan = DEFAULT_OPTIONS.enablePan,
    enableZoom = DEFAULT_OPTIONS.enableZoom,
    onTransformChange,
  } = options;

  // Compute initial transform
  const initialState: Transform = {
    ...DEFAULT_TRANSFORM,
    ...initialTransform,
  };

  // Transform state
  const [transform, setTransformState] = useState<Transform>(initialState);
  const [isPanning, setIsPanning] = useState(false);

  // Refs for tracking pan state
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  /**
   * Clamp scale within min/max bounds.
   */
  const clampScale = useCallback(
    (scale: number): number => {
      return Math.min(Math.max(scale, minScale), maxScale);
    },
    [minScale, maxScale]
  );

  /**
   * Set transform with validation and callback.
   */
  const setTransform = useCallback(
    (newTransform: Transform) => {
      const clampedTransform = {
        ...newTransform,
        scale: clampScale(newTransform.scale),
      };
      setTransformState(clampedTransform);
      onTransformChange?.(clampedTransform);
    },
    [clampScale, onTransformChange]
  );

  /**
   * Zoom in by one step.
   */
  const zoomIn = useCallback(() => {
    if (!enableZoom) return;
    setTransform({
      ...transform,
      scale: clampScale(transform.scale + zoomFactor),
    });
  }, [enableZoom, transform, clampScale, zoomFactor, setTransform]);

  /**
   * Zoom out by one step.
   */
  const zoomOut = useCallback(() => {
    if (!enableZoom) return;
    setTransform({
      ...transform,
      scale: clampScale(transform.scale - zoomFactor),
    });
  }, [enableZoom, transform, clampScale, zoomFactor, setTransform]);

  /**
   * Reset to initial transform.
   */
  const reset = useCallback(() => {
    setTransform(initialState);
  }, [setTransform, initialState]);

  /**
   * Zoom to a specific scale.
   */
  const zoomTo = useCallback(
    (scale: number) => {
      if (!enableZoom) return;
      setTransform({
        ...transform,
        scale: clampScale(scale),
      });
    },
    [enableZoom, transform, clampScale, setTransform]
  );

  /**
   * Fit content to container (reset pan and set scale to 1).
   */
  const fitToContainer = useCallback(() => {
    setTransform({
      x: 0,
      y: 0,
      scale: 1,
    });
  }, [setTransform]);

  /**
   * Handle wheel event for zooming.
   * Zooms centered on the cursor position.
   */
  const handleWheel = useCallback(
    (event: WheelEvent | React.WheelEvent) => {
      if (!enableZoom) return;

      event.preventDefault();

      const delta = event.deltaY > 0 ? -zoomFactor : zoomFactor;
      const newScale = clampScale(transform.scale + delta);

      // If we have a container, zoom centered on cursor position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = ('clientX' in event ? event.clientX : 0) - rect.left;
        const cursorY = ('clientY' in event ? event.clientY : 0) - rect.top;

        // Calculate cursor position relative to content
        const contentX = (cursorX - transform.x) / transform.scale;
        const contentY = (cursorY - transform.y) / transform.scale;

        // Calculate new transform to keep cursor position stable
        const newX = cursorX - contentX * newScale;
        const newY = cursorY - contentY * newScale;

        setTransform({
          x: newX,
          y: newY,
          scale: newScale,
        });
      } else {
        // Simple zoom without cursor centering
        setTransform({
          ...transform,
          scale: newScale,
        });
      }
    },
    [enableZoom, transform, zoomFactor, clampScale, setTransform]
  );

  /**
   * Handle mouse down for pan start.
   */
  const handleMouseDown = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      if (!enablePan) return;

      // Only start pan on left click
      if (event.button !== 0) return;

      // Don't pan if clicking on interactive elements
      const target = event.target as HTMLElement;
      if (target.closest('button, a, input, [data-interactive]')) return;

      event.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: ('clientX' in event ? event.clientX : 0) - transform.x,
        y: ('clientY' in event ? event.clientY : 0) - transform.y,
      };
    },
    [enablePan, transform.x, transform.y]
  );

  /**
   * Handle mouse move for panning.
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      if (!isPanning || !panStartRef.current) return;

      const clientX = 'clientX' in event ? event.clientX : 0;
      const clientY = 'clientY' in event ? event.clientY : 0;

      setTransform({
        ...transform,
        x: clientX - panStartRef.current.x,
        y: clientY - panStartRef.current.y,
      });
    },
    [isPanning, transform, setTransform]
  );

  /**
   * Handle mouse up for pan end.
   */
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  /**
   * Bind event handlers to a container element.
   */
  const bindToContainer = useCallback(
    (ref: RefObject<HTMLElement | null>) => {
      containerRef.current = ref.current;
    },
    []
  );

  // Set up global mouse move/up handlers when panning
  useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseMove = (event: MouseEvent) => {
      handleMouseMove(event);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // Generate CSS transform string
  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

  return {
    transform,
    isPanning,
    setTransform,
    zoomIn,
    zoomOut,
    reset,
    zoomTo,
    fitToContainer,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    transformStyle,
    bindToContainer,
  };
}

export default usePanZoom;
