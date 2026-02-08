/**
 * Custom React hooks for the ER Viewer application.
 *
 * @module hooks
 */

export { useDebounce, useDebouncedCallback } from './useDebounce';
export {
  useDiagramNavigation,
  type NavigationOptions,
  type DiagramNavigationResult,
} from './useDiagramNavigation';
export {
  usePanZoom,
  type Transform,
  type UsePanZoomOptions,
  type UsePanZoomResult,
} from './usePanZoom';
export {
  useKeyboardShortcut,
  useKeyboardShortcuts,
  formatShortcut,
  type KeyboardModifiers,
  type KeyboardShortcut,
  type UseKeyboardShortcutOptions,
} from './useKeyboardShortcut';
export {
  useContextMenu,
  shouldFlipMenu,
  getViewportSafeArea,
  type ContextMenuPosition,
  type ContextMenuState,
  type UseContextMenuOptions,
  type UseContextMenuResult,
} from './useContextMenu';
