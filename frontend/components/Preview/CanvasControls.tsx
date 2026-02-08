'use client';

import { memo, useCallback } from 'react';

/**
 * Props for the CanvasControls component.
 */
export interface CanvasControlsProps {
  /** Current zoom scale (1 = 100%) */
  scale: number;
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset view */
  onReset: () => void;
  /** Callback to fit content to container */
  onFitToContainer?: () => void;
  /** Callback to toggle fullscreen mode */
  onToggleFullscreen?: () => void;
  /** Whether currently in fullscreen mode */
  isFullscreen?: boolean;
  /** Minimum zoom scale for disabling zoom out button */
  minScale?: number;
  /** Maximum zoom scale for disabling zoom in button */
  maxScale?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Position of the controls */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show the scale percentage */
  showScale?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Size configurations for buttons.
 */
const sizeConfig = {
  sm: {
    button: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs min-w-[40px]',
    gap: 'gap-0.5',
    padding: 'p-1',
  },
  md: {
    button: 'w-8 h-8',
    icon: 'w-4 h-4',
    text: 'text-sm min-w-[48px]',
    gap: 'gap-1',
    padding: 'p-1.5',
  },
  lg: {
    button: 'w-10 h-10',
    icon: 'w-5 h-5',
    text: 'text-base min-w-[56px]',
    gap: 'gap-1.5',
    padding: 'p-2',
  },
};

/**
 * Position configurations.
 */
const positionConfig = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
};

/**
 * Plus icon for zoom in.
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

/**
 * Minus icon for zoom out.
 */
function MinusIcon({ className }: { className?: string }) {
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
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Reset/target icon.
 */
function ResetIcon({ className }: { className?: string }) {
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
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-3a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Fit to screen icon.
 */
function FitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.28 3.22a.75.75 0 010 1.06L10.56 7h2.69a.75.75 0 010 1.5H8.5a.75.75 0 01-.75-.75V3a.75.75 0 011.5 0v2.69l2.72-2.47a.75.75 0 011.31 0zM6.72 16.78a.75.75 0 010-1.06l2.72-2.72H6.75a.75.75 0 010-1.5h4.75a.75.75 0 01.75.75V17a.75.75 0 01-1.5 0v-2.69l-2.72 2.47a.75.75 0 01-1.31 0z" />
    </svg>
  );
}

/**
 * Fullscreen expand icon.
 */
function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 2A1.5 1.5 0 002 3.5v3a.75.75 0 001.5 0V4.56l2.72 2.72a.75.75 0 101.06-1.06L4.56 3.5H6.5a.75.75 0 000-1.5h-3zM16.5 2h-3a.75.75 0 000 1.5h1.94l-2.72 2.72a.75.75 0 101.06 1.06l2.72-2.72V6.5a.75.75 0 001.5 0v-3A1.5 1.5 0 0016.5 2zM7.28 12.72a.75.75 0 00-1.06 0L3.5 15.44V13.5a.75.75 0 00-1.5 0v3A1.5 1.5 0 003.5 18h3a.75.75 0 000-1.5H4.56l2.72-2.72a.75.75 0 000-1.06zm5.44 0a.75.75 0 10-1.06 1.06l2.72 2.72H12.5a.75.75 0 000 1.5h3a1.5 1.5 0 001.5-1.5v-3a.75.75 0 00-1.5 0v1.94l-2.72-2.72z" />
    </svg>
  );
}

/**
 * Fullscreen collapse/exit icon.
 */
function ExitFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l2.72 2.72H3a.75.75 0 000 1.5h4a.75.75 0 00.75-.75V3a.75.75 0 00-1.5 0v1.94L3.28 2.22zM16.72 2.22a.75.75 0 00-1.06 0L12.94 5V3a.75.75 0 00-1.5 0v3.75c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-1.94l2.72-2.72a.75.75 0 000-1.06zM3 12.5a.75.75 0 000 1.5h1.94l-2.72 2.72a.75.75 0 101.06 1.06l2.72-2.72V17a.75.75 0 001.5 0v-3.75a.75.75 0 00-.75-.75H3zm9.25 0a.75.75 0 00-.75.75V17a.75.75 0 001.5 0v-1.94l2.72 2.72a.75.75 0 101.06-1.06l-2.72-2.72H17a.75.75 0 000-1.5h-4z" />
    </svg>
  );
}

/**
 * CanvasControls component provides zoom and pan controls for the diagram preview.
 *
 * Features:
 * - Zoom in/out buttons
 * - Reset view button
 * - Optional fit-to-container button
 * - Optional fullscreen toggle button
 * - Scale percentage display
 * - Keyboard accessible
 * - Configurable size and position
 *
 * @example
 * ```tsx
 * <CanvasControls
 *   scale={1.5}
 *   onZoomIn={handleZoomIn}
 *   onZoomOut={handleZoomOut}
 *   onReset={handleReset}
 *   onFitToContainer={handleFit}
 *   onToggleFullscreen={handleFullscreen}
 *   isFullscreen={false}
 *   position="bottom-right"
 *   showScale
 * />
 * ```
 */
export const CanvasControls = memo(function CanvasControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToContainer,
  onToggleFullscreen,
  isFullscreen = false,
  minScale = 0.1,
  maxScale = 5,
  size = 'md',
  position = 'bottom-right',
  showScale = true,
  className = '',
}: CanvasControlsProps) {
  const sizes = sizeConfig[size];
  const positionClass = positionConfig[position];

  // Format scale as percentage
  const scalePercent = Math.round(scale * 100);

  // Check if at scale limits
  const atMinScale = scale <= minScale;
  const atMaxScale = scale >= maxScale;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, action: () => void, disabled?: boolean) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    []
  );

  return (
    <div
      className={`
        canvas-controls
        absolute ${positionClass}
        z-10
        flex items-center ${sizes.gap}
        bg-background/90 backdrop-blur-sm
        border border-border
        rounded-lg shadow-sm
        ${sizes.padding}
        ${className}
      `}
      role="toolbar"
      aria-label="Canvas zoom controls"
    >
      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={onZoomOut}
        onKeyDown={(e) => handleKeyDown(e, onZoomOut, atMinScale)}
        disabled={atMinScale}
        className={`
          ${sizes.button}
          inline-flex items-center justify-center
          rounded-md
          text-muted-foreground
          hover:text-foreground hover:bg-muted
          focus:outline-none focus:ring-2 focus:ring-primary/50
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
          transition-colors duration-150
        `}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <MinusIcon className={sizes.icon} />
      </button>

      {/* Scale Display */}
      {showScale && (
        <span
          className={`
            ${sizes.text}
            text-center
            text-muted-foreground
            font-mono
            select-none
          `}
          aria-live="polite"
          aria-label={`Current zoom: ${scalePercent}%`}
        >
          {scalePercent}%
        </span>
      )}

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={onZoomIn}
        onKeyDown={(e) => handleKeyDown(e, onZoomIn, atMaxScale)}
        disabled={atMaxScale}
        className={`
          ${sizes.button}
          inline-flex items-center justify-center
          rounded-md
          text-muted-foreground
          hover:text-foreground hover:bg-muted
          focus:outline-none focus:ring-2 focus:ring-primary/50
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
          transition-colors duration-150
        `}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <PlusIcon className={sizes.icon} />
      </button>

      {/* Separator */}
      <div className="w-px h-4 bg-border mx-0.5" aria-hidden="true" />

      {/* Reset Button */}
      <button
        type="button"
        onClick={onReset}
        onKeyDown={(e) => handleKeyDown(e, onReset)}
        className={`
          ${sizes.button}
          inline-flex items-center justify-center
          rounded-md
          text-muted-foreground
          hover:text-foreground hover:bg-muted
          focus:outline-none focus:ring-2 focus:ring-primary/50
          transition-colors duration-150
        `}
        aria-label="Reset zoom"
        title="Reset zoom (100%)"
      >
        <ResetIcon className={sizes.icon} />
      </button>

      {/* Fit to Container Button (optional) */}
      {onFitToContainer && (
        <button
          type="button"
          onClick={onFitToContainer}
          onKeyDown={(e) => handleKeyDown(e, onFitToContainer)}
          className={`
            ${sizes.button}
            inline-flex items-center justify-center
            rounded-md
            text-muted-foreground
            hover:text-foreground hover:bg-muted
            focus:outline-none focus:ring-2 focus:ring-primary/50
            transition-colors duration-150
          `}
          aria-label="Fit to screen"
          title="Fit to screen"
        >
          <FitIcon className={sizes.icon} />
        </button>
      )}

      {/* Fullscreen Toggle Button (optional) */}
      {onToggleFullscreen && (
        <>
          {/* Separator before fullscreen */}
          <div className="w-px h-4 bg-border mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleFullscreen}
            onKeyDown={(e) => handleKeyDown(e, onToggleFullscreen)}
            className={`
              ${sizes.button}
              inline-flex items-center justify-center
              rounded-md
              text-muted-foreground
              hover:text-foreground hover:bg-muted
              focus:outline-none focus:ring-2 focus:ring-primary/50
              transition-colors duration-150
            `}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? (
              <ExitFullscreenIcon className={sizes.icon} />
            ) : (
              <FullscreenIcon className={sizes.icon} />
            )}
          </button>
        </>
      )}
    </div>
  );
});

export default CanvasControls;
