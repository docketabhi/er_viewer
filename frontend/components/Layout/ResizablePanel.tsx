'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';

/**
 * Direction of the resize handle.
 */
export type ResizeDirection = 'horizontal' | 'vertical';

/**
 * Props for the ResizablePanel component.
 */
export interface ResizablePanelProps {
  /** Content to render inside the panel */
  children: ReactNode;
  /** Initial width (for horizontal) or height (for vertical) in pixels */
  defaultSize?: number;
  /** Minimum size in pixels */
  minSize?: number;
  /** Maximum size in pixels */
  maxSize?: number;
  /** Direction of resize - horizontal resizes width, vertical resizes height */
  direction?: ResizeDirection;
  /** Position of the resize handle */
  handlePosition?: 'start' | 'end';
  /** Whether the panel is collapsible */
  collapsible?: boolean;
  /** Whether the panel is currently collapsed */
  collapsed?: boolean;
  /** Callback when panel is collapsed/expanded */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Callback when size changes */
  onSizeChange?: (size: number) => void;
  /** Additional CSS class for the panel container */
  className?: string;
  /** Additional CSS class for the resize handle */
  handleClassName?: string;
  /** Unique ID for persisting size to localStorage */
  persistKey?: string;
  /** Whether to show the resize handle */
  showHandle?: boolean;
  /** Panel header content */
  header?: ReactNode;
  /** Aria label for accessibility */
  'aria-label'?: string;
}

/**
 * Size presets for quick reference.
 */
export const PANEL_SIZES = {
  /** Left sidebar default width */
  SIDEBAR_LEFT: 240,
  /** Right sidebar default width */
  SIDEBAR_RIGHT: 280,
  /** Editor minimum width */
  EDITOR_MIN: 300,
  /** Preview minimum width */
  PREVIEW_MIN: 300,
  /** Mobile breakpoint */
  MOBILE_BREAKPOINT: 768,
  /** Tablet breakpoint */
  TABLET_BREAKPOINT: 1024,
};

/**
 * Hook to persist panel size to localStorage.
 */
function usePersistentSize(
  persistKey: string | undefined,
  defaultSize: number
): [number, (size: number) => void] {
  const [size, setSize] = useState<number>(() => {
    if (!persistKey || typeof window === 'undefined') {
      return defaultSize;
    }
    try {
      const stored = localStorage.getItem(`panel-size-${persistKey}`);
      return stored ? parseInt(stored, 10) : defaultSize;
    } catch {
      return defaultSize;
    }
  });

  const setSizeWithPersistence = useCallback(
    (newSize: number) => {
      setSize(newSize);
      if (persistKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`panel-size-${persistKey}`, String(newSize));
        } catch {
          // Ignore storage errors
        }
      }
    },
    [persistKey]
  );

  return [size, setSizeWithPersistence];
}

/**
 * ResizablePanel component for creating resizable panel layouts.
 *
 * Supports both horizontal (width) and vertical (height) resizing with
 * mouse and touch input. Includes optional collapse functionality and
 * size persistence via localStorage.
 *
 * @example
 * ```tsx
 * <ResizablePanel
 *   defaultSize={240}
 *   minSize={200}
 *   maxSize={400}
 *   direction="horizontal"
 *   handlePosition="end"
 *   collapsible
 *   persistKey="left-sidebar"
 * >
 *   <FileTree />
 * </ResizablePanel>
 * ```
 */
export const ResizablePanel = memo(function ResizablePanel({
  children,
  defaultSize = 240,
  minSize = 150,
  maxSize = 500,
  direction = 'horizontal',
  handlePosition = 'end',
  collapsible = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  onSizeChange,
  className = '',
  handleClassName = '',
  persistKey,
  showHandle = true,
  header,
  'aria-label': ariaLabel,
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = usePersistentSize(persistKey, defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use controlled collapsed state if provided
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  /**
   * Handle collapse toggle.
   */
  const toggleCollapsed = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  /**
   * Start resize operation.
   */
  const startResize = useCallback(
    (clientX: number, clientY: number) => {
      if (!panelRef.current) return;

      setIsResizing(true);
      const startPos = direction === 'horizontal' ? clientX : clientY;
      const startSize = size;

      const handleMove = (moveClientX: number, moveClientY: number) => {
        const currentPos = direction === 'horizontal' ? moveClientX : moveClientY;
        const delta = handlePosition === 'end'
          ? currentPos - startPos
          : startPos - currentPos;

        const newSize = Math.min(Math.max(startSize + delta, minSize), maxSize);
        setSize(newSize);
        onSizeChange?.(newSize);
      };

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      const stopResize = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', stopResize);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [direction, handlePosition, minSize, maxSize, size, setSize, onSizeChange]
  );

  /**
   * Handle mouse down on resize handle.
   */
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      startResize(e.clientX, e.clientY);
    },
    [startResize]
  );

  /**
   * Handle touch start on resize handle.
   */
  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (e.touches.length === 1) {
        startResize(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [startResize]
  );

  /**
   * Handle double-click to collapse/expand.
   */
  const handleDoubleClick = useCallback(() => {
    if (collapsible) {
      toggleCollapsed();
    }
  }, [collapsible, toggleCollapsed]);

  /**
   * Handle keyboard interaction on resize handle.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 50 : 10;
      let newSize = size;

      if (direction === 'horizontal') {
        if (e.key === 'ArrowLeft') {
          newSize = Math.max(size - step, minSize);
        } else if (e.key === 'ArrowRight') {
          newSize = Math.min(size + step, maxSize);
        }
      } else {
        if (e.key === 'ArrowUp') {
          newSize = Math.max(size - step, minSize);
        } else if (e.key === 'ArrowDown') {
          newSize = Math.min(size + step, maxSize);
        }
      }

      if (newSize !== size) {
        e.preventDefault();
        setSize(newSize);
        onSizeChange?.(newSize);
      }

      // Enter/Space to toggle collapse
      if ((e.key === 'Enter' || e.key === ' ') && collapsible) {
        e.preventDefault();
        toggleCollapsed();
      }
    },
    [direction, size, minSize, maxSize, setSize, onSizeChange, collapsible, toggleCollapsed]
  );

  // Sync size from props when defaultSize changes
  useEffect(() => {
    if (!persistKey) {
      setSize(defaultSize);
    }
  }, [defaultSize, persistKey, setSize]);

  // Calculate panel styles
  const panelStyle = {
    [direction === 'horizontal' ? 'width' : 'height']: isCollapsed ? 0 : size,
    [direction === 'horizontal' ? 'minWidth' : 'minHeight']: isCollapsed ? 0 : minSize,
    [direction === 'horizontal' ? 'maxWidth' : 'maxHeight']: isCollapsed ? 0 : maxSize,
  };

  // Resize handle component
  const ResizeHandle = showHandle && !isCollapsed && (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-valuenow={size}
      aria-valuemin={minSize}
      aria-valuemax={maxSize}
      aria-label={`Resize ${ariaLabel || 'panel'}`}
      tabIndex={0}
      className={`
        resizable-panel__handle
        ${direction === 'horizontal'
          ? 'w-1 cursor-col-resize hover:w-1.5'
          : 'h-1 cursor-row-resize hover:h-1.5'
        }
        ${direction === 'horizontal' ? 'h-full' : 'w-full'}
        bg-border hover:bg-primary/50
        transition-all duration-150
        flex-shrink-0
        ${isResizing ? 'bg-primary' : ''}
        ${handleClassName}
      `}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Visual indicator for drag handle */}
      <div
        className={`
          ${direction === 'horizontal' ? 'w-full h-8' : 'h-full w-8'}
          flex items-center justify-center
          opacity-0 hover:opacity-100 transition-opacity
        `}
      >
        <div
          className={`
            ${direction === 'horizontal' ? 'w-0.5 h-4' : 'h-0.5 w-4'}
            bg-muted-foreground/50 rounded-full
          `}
        />
      </div>
    </div>
  );

  // Collapse toggle button (for collapsed state)
  const CollapseToggle = collapsible && isCollapsed && (
    <button
      type="button"
      onClick={toggleCollapsed}
      className={`
        resizable-panel__collapse-toggle
        ${direction === 'horizontal' ? 'w-6 h-full' : 'h-6 w-full'}
        bg-muted hover:bg-muted/80
        border border-border
        flex items-center justify-center
        transition-colors duration-150
        flex-shrink-0
      `}
      aria-label={`Expand ${ariaLabel || 'panel'}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`w-4 h-4 text-muted-foreground ${
          direction === 'horizontal'
            ? handlePosition === 'end' ? '' : 'rotate-180'
            : handlePosition === 'end' ? 'rotate-90' : '-rotate-90'
        }`}
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );

  return (
    <div
      className={`
        resizable-panel
        flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${isResizing ? 'select-none' : ''}
        ${className}
      `}
    >
      {/* Handle at start position */}
      {handlePosition === 'start' && (
        <>
          {ResizeHandle}
          {CollapseToggle}
        </>
      )}

      {/* Panel content */}
      <div
        ref={panelRef}
        className={`
          resizable-panel__content
          flex flex-col
          overflow-hidden
          transition-all duration-200
          ${isCollapsed ? 'w-0 min-w-0' : ''}
        `}
        style={panelStyle}
        aria-label={ariaLabel}
        aria-hidden={isCollapsed}
      >
        {/* Optional header */}
        {header && !isCollapsed && (
          <div className="resizable-panel__header flex-shrink-0 border-b border-border bg-muted/50">
            {header}
          </div>
        )}

        {/* Panel body */}
        <div className="resizable-panel__body flex-1 overflow-auto">
          {!isCollapsed && children}
        </div>
      </div>

      {/* Handle at end position */}
      {handlePosition === 'end' && (
        <>
          {CollapseToggle}
          {ResizeHandle}
        </>
      )}
    </div>
  );
});

export default ResizablePanel;
