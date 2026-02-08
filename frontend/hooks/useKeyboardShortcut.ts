'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard modifier keys configuration.
 */
export interface KeyboardModifiers {
  /** Whether Ctrl (or Cmd on Mac) must be pressed */
  ctrlOrMeta?: boolean;
  /** Whether Ctrl must be pressed (Windows-specific) */
  ctrl?: boolean;
  /** Whether Meta/Cmd must be pressed (Mac-specific) */
  meta?: boolean;
  /** Whether Shift must be pressed */
  shift?: boolean;
  /** Whether Alt must be pressed */
  alt?: boolean;
}

/**
 * Configuration for a keyboard shortcut.
 */
export interface KeyboardShortcut {
  /** The key to listen for (e.g., 'p', 'Enter', 'Escape') */
  key: string;
  /** Modifier keys required */
  modifiers?: KeyboardModifiers;
  /** Whether the shortcut should work in input elements */
  enableInInputs?: boolean;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
}

/**
 * Options for the useKeyboardShortcut hook.
 */
export interface UseKeyboardShortcutOptions extends KeyboardShortcut {
  /** The callback to execute when the shortcut is triggered */
  callback: (event: KeyboardEvent) => void;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

/**
 * Checks if a keyboard event matches the specified shortcut configuration.
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Check key match (case-insensitive for single characters)
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) {
    return false;
  }

  const modifiers = shortcut.modifiers ?? {};

  // Handle ctrlOrMeta (Cmd on Mac, Ctrl on Windows/Linux)
  if (modifiers.ctrlOrMeta !== undefined) {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const requiredModifier = isMac ? event.metaKey : event.ctrlKey;
    if (modifiers.ctrlOrMeta && !requiredModifier) return false;
    if (!modifiers.ctrlOrMeta && requiredModifier) return false;
  }

  // Check individual modifiers
  if (modifiers.ctrl !== undefined) {
    if (modifiers.ctrl !== event.ctrlKey) return false;
  }

  if (modifiers.meta !== undefined) {
    if (modifiers.meta !== event.metaKey) return false;
  }

  if (modifiers.shift !== undefined) {
    if (modifiers.shift !== event.shiftKey) return false;
  }

  if (modifiers.alt !== undefined) {
    if (modifiers.alt !== event.altKey) return false;
  }

  return true;
}

/**
 * Checks if the event target is an input-like element.
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Hook that listens for a specific keyboard shortcut and triggers a callback.
 *
 * Supports modifier keys (Ctrl, Cmd, Shift, Alt) and handles Mac/Windows differences.
 * Can be configured to work in input elements or only in non-input contexts.
 *
 * @param options - Configuration for the keyboard shortcut
 *
 * @example
 * ```tsx
 * // Listen for Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
 * useKeyboardShortcut({
 *   key: 'p',
 *   modifiers: { ctrlOrMeta: true, shift: true },
 *   callback: () => setCommandPaletteOpen(true),
 * });
 *
 * // Listen for Escape key
 * useKeyboardShortcut({
 *   key: 'Escape',
 *   callback: () => closeModal(),
 *   enableInInputs: true,
 * });
 * ```
 */
export function useKeyboardShortcut({
  key,
  modifiers,
  callback,
  enabled = true,
  enableInInputs = false,
  preventDefault = true,
  stopPropagation = false,
}: UseKeyboardShortcutOptions): void {
  const callbackRef = useRef(callback);

  // Keep callback ref updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if disabled
      if (!enabled) return;

      // Skip if in input and not enabled for inputs
      if (!enableInInputs && isInputElement(event.target)) return;

      // Check if the shortcut matches
      if (!matchesShortcut(event, { key, modifiers })) return;

      // Prevent default and stop propagation as configured
      if (preventDefault) {
        event.preventDefault();
      }

      if (stopPropagation) {
        event.stopPropagation();
      }

      // Execute the callback
      callbackRef.current(event);
    },
    [enabled, enableInInputs, key, modifiers, preventDefault, stopPropagation]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Hook for managing multiple keyboard shortcuts at once.
 *
 * @param shortcuts - Array of shortcut configurations
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'p',
 *     modifiers: { ctrlOrMeta: true, shift: true },
 *     callback: openCommandPalette,
 *   },
 *   {
 *     key: 'Escape',
 *     callback: closeCommandPalette,
 *     enableInInputs: true,
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: UseKeyboardShortcutOptions[]): void {
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const {
        key,
        modifiers,
        callback,
        enabled = true,
        enableInInputs = false,
        preventDefault = true,
        stopPropagation = false,
      } = shortcut;

      // Skip if disabled
      if (!enabled) continue;

      // Skip if in input and not enabled for inputs
      if (!enableInInputs && isInputElement(event.target)) continue;

      // Check if the shortcut matches
      if (!matchesShortcut(event, { key, modifiers })) continue;

      // Prevent default and stop propagation as configured
      if (preventDefault) {
        event.preventDefault();
      }

      if (stopPropagation) {
        event.stopPropagation();
      }

      // Execute the callback
      callback(event);

      // Stop processing after first match
      break;
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Formats a shortcut for display (e.g., "⌘⇧P" on Mac, "Ctrl+Shift+P" on Windows).
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  const modifiers = shortcut.modifiers ?? {};

  if (modifiers.ctrlOrMeta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (modifiers.ctrl) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (modifiers.meta) {
    parts.push(isMac ? '⌘' : 'Win');
  }
  if (modifiers.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (modifiers.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format the key
  let keyDisplay = shortcut.key;
  if (keyDisplay.length === 1) {
    keyDisplay = keyDisplay.toUpperCase();
  } else {
    // Handle special keys
    const specialKeys: Record<string, string> = {
      Enter: isMac ? '↩' : 'Enter',
      Escape: isMac ? 'esc' : 'Esc',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Backspace: isMac ? '⌫' : 'Backspace',
      Delete: isMac ? '⌦' : 'Del',
      Tab: isMac ? '⇥' : 'Tab',
      Space: isMac ? '␣' : 'Space',
    };
    keyDisplay = specialKeys[keyDisplay] ?? keyDisplay;
  }

  parts.push(keyDisplay);

  return isMac ? parts.join('') : parts.join('+');
}

export default useKeyboardShortcut;
