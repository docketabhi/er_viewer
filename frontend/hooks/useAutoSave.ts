'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Storage key prefix for localStorage persistence.
 */
const STORAGE_KEY_PREFIX = 'er-viewer-diagram-';

/**
 * Options for the useAutoSave hook.
 */
export interface UseAutoSaveOptions<T> {
  /** Unique identifier for the content being saved */
  id: string;
  /** The content to auto-save */
  content: T;
  /** Function to save content to the backend */
  onSave: (content: T) => Promise<void>;
  /** Auto-save interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Debounce delay in milliseconds before marking as dirty (default: 1000) */
  debounceDelay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when save succeeds */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Whether to persist to localStorage as backup (default: true) */
  useLocalStorage?: boolean;
}

/**
 * Result returned by the useAutoSave hook.
 */
export interface UseAutoSaveResult {
  /** Whether content has unsaved changes */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Last save error (if any) */
  saveError: Error | null;
  /** Timestamp of last successful save */
  lastSavedAt: Date | null;
  /** Manually trigger a save */
  save: () => Promise<void>;
  /** Mark content as saved (clears dirty state) */
  markSaved: () => void;
  /** Mark content as dirty */
  markDirty: () => void;
  /** Clear any save errors */
  clearError: () => void;
}

/**
 * Serialize content for localStorage storage.
 */
function serializeContent<T>(content: T): string {
  return JSON.stringify({
    content,
    savedAt: new Date().toISOString(),
  });
}

/**
 * Deserialize content from localStorage storage.
 */
function deserializeContent<T>(stored: string): { content: T; savedAt: Date } | null {
  try {
    const parsed = JSON.parse(stored);
    return {
      content: parsed.content as T,
      savedAt: new Date(parsed.savedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Hook for auto-saving content with debouncing, dirty state tracking, and localStorage backup.
 *
 * This hook provides:
 * - Automatic periodic saving with configurable intervals
 * - Debounced dirty state detection
 * - localStorage backup when API is unavailable
 * - Manual save trigger
 * - Error handling and retry capability
 *
 * @param options - Auto-save options
 * @returns Auto-save state and controls
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const [content, setContent] = useState('');
 *   const {
 *     isDirty,
 *     isSaving,
 *     lastSavedAt,
 *     save,
 *   } = useAutoSave({
 *     id: diagramId,
 *     content,
 *     onSave: async (content) => {
 *       await diagramsApi.updateSource(diagramId, content);
 *     },
 *     interval: 30000, // 30 seconds
 *   });
 *
 *   return (
 *     <div>
 *       <Editor value={content} onChange={setContent} />
 *       {isDirty && <span>Unsaved changes</span>}
 *       {isSaving && <span>Saving...</span>}
 *       {lastSavedAt && <span>Last saved: {lastSavedAt.toLocaleTimeString()}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const {
    id,
    content,
    onSave,
    interval = 30000,
    debounceDelay = 1000,
    enabled = true,
    onSaveSuccess,
    onSaveError,
    useLocalStorage = true,
  } = options;

  // State
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs for tracking
  const contentRef = useRef<T>(content);
  const previousContentRef = useRef<T>(content);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const saveInProgressRef = useRef(false);

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  /**
   * Save content to localStorage as backup.
   */
  const saveToLocalStorage = useCallback(
    (contentToSave: T) => {
      if (!useLocalStorage) return;
      try {
        const key = `${STORAGE_KEY_PREFIX}${id}`;
        localStorage.setItem(key, serializeContent(contentToSave));
      } catch {
        // localStorage might be full or unavailable - fail silently
      }
    },
    [id, useLocalStorage]
  );

  /**
   * Perform the actual save operation.
   */
  const performSave = useCallback(async () => {
    // Prevent concurrent saves
    if (saveInProgressRef.current || !isMountedRef.current) {
      return;
    }

    const contentToSave = contentRef.current;

    // Skip if not dirty or no content
    if (!isDirty) {
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(contentToSave);

      if (isMountedRef.current) {
        setIsDirty(false);
        setLastSavedAt(new Date());
        previousContentRef.current = contentToSave;
        onSaveSuccess?.();
      }

      // Save to localStorage as backup on success
      saveToLocalStorage(contentToSave);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (isMountedRef.current) {
        setSaveError(error);
        onSaveError?.(error);
      }

      // Still save to localStorage even on API failure
      saveToLocalStorage(contentToSave);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      saveInProgressRef.current = false;
    }
  }, [isDirty, onSave, onSaveSuccess, onSaveError, saveToLocalStorage]);

  /**
   * Manual save trigger.
   */
  const save = useCallback(async () => {
    await performSave();
  }, [performSave]);

  /**
   * Mark content as saved (clear dirty state).
   */
  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSavedAt(new Date());
    previousContentRef.current = contentRef.current;
  }, []);

  /**
   * Mark content as dirty.
   */
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  /**
   * Clear save error.
   */
  const clearError = useCallback(() => {
    setSaveError(null);
  }, []);

  /**
   * Detect content changes and mark as dirty with debounce.
   */
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check if content has changed from the previously saved content
    const hasChanged =
      JSON.stringify(content) !== JSON.stringify(previousContentRef.current);

    if (hasChanged && enabled) {
      // Debounce the dirty state change
      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsDirty(true);
        }
      }, debounceDelay);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, debounceDelay, enabled]);

  /**
   * Set up auto-save interval.
   */
  useEffect(() => {
    if (!enabled) {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // Set up auto-save interval
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty && !saveInProgressRef.current) {
        performSave();
      }
    }, interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [enabled, interval, isDirty, performSave]);

  /**
   * Save on unmount if dirty.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Save to localStorage on unmount if there are unsaved changes
      if (isDirty && useLocalStorage) {
        try {
          const key = `${STORAGE_KEY_PREFIX}${id}`;
          localStorage.setItem(key, serializeContent(contentRef.current));
        } catch {
          // Fail silently
        }
      }
    };
  }, [id, isDirty, useLocalStorage]);

  return {
    isDirty,
    isSaving,
    saveError,
    lastSavedAt,
    save,
    markSaved,
    markDirty,
    clearError,
  };
}

/**
 * Load content from localStorage backup.
 *
 * @param id - The unique identifier for the content
 * @returns The stored content and save timestamp, or null if not found
 *
 * @example
 * ```tsx
 * const stored = loadFromLocalStorage<string>('diagram-123');
 * if (stored) {
 *   setContent(stored.content);
 *   console.log('Loaded from:', stored.savedAt);
 * }
 * ```
 */
export function loadFromLocalStorage<T>(id: string): { content: T; savedAt: Date } | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return deserializeContent<T>(stored);
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Remove content from localStorage.
 *
 * @param id - The unique identifier for the content to remove
 *
 * @example
 * ```tsx
 * clearLocalStorage('diagram-123');
 * ```
 */
export function clearLocalStorage(id: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    localStorage.removeItem(key);
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * List all saved diagram IDs in localStorage.
 *
 * @returns Array of diagram IDs that have localStorage backups
 *
 * @example
 * ```tsx
 * const savedIds = listSavedDiagrams();
 * console.log('Found local backups for:', savedIds);
 * ```
 */
export function listSavedDiagrams(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        ids.push(key.slice(STORAGE_KEY_PREFIX.length));
      }
    }
  } catch {
    // localStorage might be unavailable
  }
  return ids;
}

export default useAutoSave;
