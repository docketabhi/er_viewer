'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Position for the context menu.
 */
export interface ContextMenuPosition {
  /** X coordinate (left) */
  x: number;
  /** Y coordinate (top) */
  y: number;
}

/**
 * State for the context menu.
 */
export interface ContextMenuState<T = unknown> {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Position of the menu */
  position: ContextMenuPosition;
  /** Target data associated with the context menu (e.g., entity name) */
  targetData: T | null;
}

/**
 * Options for the useContextMenu hook.
 */
export interface UseContextMenuOptions {
  /** Callback when the menu is opened */
  onOpen?: () => void;
  /** Callback when the menu is closed */
  onClose?: () => void;
  /** Whether clicking outside should close the menu (default: true) */
  closeOnClickOutside?: boolean;
  /** Whether pressing Escape should close the menu (default: true) */
  closeOnEscape?: boolean;
  /** Whether scrolling should close the menu (default: true) */
  closeOnScroll?: boolean;
  /** Whether window resize should close the menu (default: true) */
  closeOnResize?: boolean;
}

/**
 * Result of the useContextMenu hook.
 */
export interface UseContextMenuResult<T = unknown> {
  /** Current state of the context menu */
  state: ContextMenuState<T>;
  /** Open the context menu at a specific position */
  openMenu: (event: MouseEvent | React.MouseEvent, targetData?: T) => void;
  /** Close the context menu */
  closeMenu: () => void;
  /** Ref to attach to the menu element for click outside detection */
  menuRef: React.RefObject<HTMLDivElement>;
  /** Get position adjusted to stay within viewport */
  getAdjustedPosition: (
    menuWidth: number,
    menuHeight: number
  ) => ContextMenuPosition;
}

/**
 * Default initial state for the context menu.
 */
const DEFAULT_STATE: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  targetData: null,
};

/**
 * Hook for managing context menu state and behavior.
 *
 * Provides state management for opening/closing the menu, positioning,
 * and automatic closing on various events (click outside, Escape key,
 * scroll, resize).
 *
 * @param options - Configuration options for the context menu
 * @returns Context menu state and controls
 *
 * @example
 * ```tsx
 * const { state, openMenu, closeMenu, menuRef, getAdjustedPosition } = useContextMenu<string>({
 *   onOpen: () => console.log('Menu opened'),
 *   onClose: () => console.log('Menu closed'),
 * });
 *
 * // Open menu on right-click
 * const handleContextMenu = (e: MouseEvent, entityName: string) => {
 *   openMenu(e, entityName);
 * };
 *
 * // Render
 * {state.isOpen && (
 *   <div ref={menuRef} style={{ left: state.position.x, top: state.position.y }}>
 *     Context menu for {state.targetData}
 *   </div>
 * )}
 * ```
 */
export function useContextMenu<T = unknown>(
  options: UseContextMenuOptions = {}
): UseContextMenuResult<T> {
  const {
    onOpen,
    onClose,
    closeOnClickOutside = true,
    closeOnEscape = true,
    closeOnScroll = true,
    closeOnResize = true,
  } = options;

  const [state, setState] = useState<ContextMenuState<T>>({
    ...DEFAULT_STATE,
    targetData: null,
  } as ContextMenuState<T>);

  const menuRef = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Keep callback refs updated
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /**
   * Opens the context menu at the event position.
   */
  const openMenu = useCallback((event: MouseEvent | React.MouseEvent, targetData?: T) => {
    event.preventDefault();
    event.stopPropagation();

    const position: ContextMenuPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    setState({
      isOpen: true,
      position,
      targetData: targetData ?? null,
    });

    onOpenRef.current?.();
  }, []);

  /**
   * Closes the context menu.
   */
  const closeMenu = useCallback(() => {
    setState((prev) => {
      if (!prev.isOpen) return prev;
      return {
        ...prev,
        isOpen: false,
      };
    });
    onCloseRef.current?.();
  }, []);

  /**
   * Returns position adjusted to stay within the viewport.
   */
  const getAdjustedPosition = useCallback(
    (menuWidth: number, menuHeight: number): ContextMenuPosition => {
      const { x, y } = state.position;
      const padding = 8;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust x if menu would overflow right edge
      let adjustedX = x;
      if (x + menuWidth + padding > viewportWidth) {
        adjustedX = Math.max(padding, viewportWidth - menuWidth - padding);
      }

      // Adjust y if menu would overflow bottom edge
      let adjustedY = y;
      if (y + menuHeight + padding > viewportHeight) {
        adjustedY = Math.max(padding, viewportHeight - menuHeight - padding);
      }

      return { x: adjustedX, y: adjustedY };
    },
    [state.position]
  );

  // Handle click outside to close
  useEffect(() => {
    if (!state.isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    // Delay adding the listener to avoid immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.isOpen, closeOnClickOutside, closeMenu]);

  // Handle Escape key to close
  useEffect(() => {
    if (!state.isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.isOpen, closeOnEscape, closeMenu]);

  // Handle scroll to close
  useEffect(() => {
    if (!state.isOpen || !closeOnScroll) return;

    const handleScroll = () => {
      closeMenu();
    };

    // Use capture to catch all scroll events
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [state.isOpen, closeOnScroll, closeMenu]);

  // Handle resize to close
  useEffect(() => {
    if (!state.isOpen || !closeOnResize) return;

    const handleResize = () => {
      closeMenu();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [state.isOpen, closeOnResize, closeMenu]);

  return {
    state,
    openMenu,
    closeMenu,
    menuRef: menuRef as React.RefObject<HTMLDivElement>,
    getAdjustedPosition,
  };
}

/**
 * Utility to calculate if a position needs to be flipped to fit in viewport.
 */
export function shouldFlipMenu(
  position: ContextMenuPosition,
  menuWidth: number,
  menuHeight: number,
  padding = 8
): { flipX: boolean; flipY: boolean } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return {
    flipX: position.x + menuWidth + padding > viewportWidth,
    flipY: position.y + menuHeight + padding > viewportHeight,
  };
}

/**
 * Gets the safe area for positioning a menu within the viewport.
 */
export function getViewportSafeArea(padding = 8): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  return {
    minX: padding,
    maxX: window.innerWidth - padding,
    minY: padding,
    maxY: window.innerHeight - padding,
  };
}

export default useContextMenu;
