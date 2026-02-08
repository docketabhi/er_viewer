'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { BlockDirective } from '@/lib/mermaid/types';

/**
 * Storage key prefix for localStorage persistence.
 */
const STORAGE_KEY_PREFIX = 'er-viewer-diagram-';
const CURRENT_DIAGRAM_KEY = 'er-viewer-current-diagram';

/**
 * Represents a diagram in the navigation stack.
 */
export interface DiagramEntry {
  /** Unique identifier for the diagram */
  id: string;
  /** Display title for the diagram */
  title: string;
  /** The Mermaid source code */
  source: string;
  /** The block directive that led to this diagram (if navigated from parent) */
  fromBlock?: BlockDirective;
  /** The parent diagram ID (if this is a child diagram) */
  parentId?: string;
}

/**
 * Navigation history item for breadcrumb display.
 */
export interface BreadcrumbItem {
  /** The diagram ID */
  id: string;
  /** Display label for the breadcrumb */
  label: string;
  /** Whether this is the current (active) diagram */
  isCurrent: boolean;
}

/**
 * State for the diagram context.
 */
export interface DiagramState {
  /** The currently active diagram */
  currentDiagram: DiagramEntry | null;
  /** Stack of diagrams for back navigation (history) */
  navigationStack: DiagramEntry[];
  /** Whether navigation is in progress */
  isNavigating: boolean;
  /** Error from navigation attempt */
  navigationError: string | null;
  /** Whether the current diagram has unsaved changes */
  isDirty: boolean;
  /** Timestamp of last save */
  lastSavedAt: Date | null;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Last save error */
  saveError: string | null;
}

/**
 * Actions for the diagram reducer.
 */
type DiagramAction =
  | { type: 'SET_CURRENT_DIAGRAM'; payload: DiagramEntry }
  | { type: 'NAVIGATE_TO_CHILD'; payload: DiagramEntry }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'NAVIGATE_TO_INDEX'; payload: number }
  | { type: 'UPDATE_SOURCE'; payload: string }
  | { type: 'SET_NAVIGATING'; payload: boolean }
  | { type: 'SET_NAVIGATION_ERROR'; payload: string | null }
  | { type: 'RESET_NAVIGATION' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'MARK_SAVED'; payload: Date }
  | { type: 'LOAD_FROM_STORAGE'; payload: { diagram: DiagramEntry; savedAt: Date } };

/**
 * Context value type.
 */
export interface DiagramContextValue {
  /** Current state */
  state: DiagramState;
  /** Set the root diagram */
  setRootDiagram: (diagram: DiagramEntry) => void;
  /** Navigate to a child diagram (via block click) */
  navigateToChild: (diagram: DiagramEntry) => void;
  /** Navigate back to parent diagram */
  navigateBack: () => void;
  /** Navigate to a specific index in the breadcrumb trail */
  navigateToIndex: (index: number) => void;
  /** Update the current diagram's source */
  updateSource: (source: string) => void;
  /** Get breadcrumb items for display */
  getBreadcrumbs: () => BreadcrumbItem[];
  /** Check if back navigation is possible */
  canGoBack: () => boolean;
  /** Get the current diagram depth (0 = root) */
  getCurrentDepth: () => number;
  /** Clear navigation error */
  clearNavigationError: () => void;
  /** Reset navigation to root */
  resetNavigation: () => void;
  /** Mark the current diagram as dirty (has unsaved changes) */
  markDirty: () => void;
  /** Mark the current diagram as saved */
  markSaved: () => void;
  /** Set saving state */
  setSaving: (isSaving: boolean) => void;
  /** Set save error */
  setSaveError: (error: string | null) => void;
  /** Save current diagram to localStorage */
  saveToLocalStorage: () => void;
  /** Load diagram from localStorage by ID */
  loadFromLocalStorage: (id: string) => DiagramEntry | null;
  /** Check if there's a localStorage backup for the current diagram */
  hasLocalBackup: () => boolean;
}

/**
 * Initial state for the diagram context.
 */
const initialState: DiagramState = {
  currentDiagram: null,
  navigationStack: [],
  isNavigating: false,
  navigationError: null,
  isDirty: false,
  lastSavedAt: null,
  isSaving: false,
  saveError: null,
};

/**
 * Reducer for diagram state management.
 */
function diagramReducer(
  state: DiagramState,
  action: DiagramAction
): DiagramState {
  switch (action.type) {
    case 'SET_CURRENT_DIAGRAM':
      // Setting root diagram - clear the stack
      return {
        ...state,
        currentDiagram: action.payload,
        navigationStack: [],
        navigationError: null,
        isDirty: false,
        lastSavedAt: null,
        saveError: null,
      };

    case 'NAVIGATE_TO_CHILD':
      // Push current diagram to stack and set new current
      if (!state.currentDiagram) {
        return {
          ...state,
          currentDiagram: action.payload,
          navigationError: null,
          isDirty: false,
          lastSavedAt: null,
        };
      }
      return {
        ...state,
        navigationStack: [...state.navigationStack, state.currentDiagram],
        currentDiagram: action.payload,
        isNavigating: false,
        navigationError: null,
        isDirty: false,
        lastSavedAt: null,
      };

    case 'NAVIGATE_BACK':
      // Pop from stack and set as current
      if (state.navigationStack.length === 0) {
        return state;
      }
      const stack = [...state.navigationStack];
      const previousDiagram = stack.pop()!;
      return {
        ...state,
        navigationStack: stack,
        currentDiagram: previousDiagram,
        isNavigating: false,
        navigationError: null,
        isDirty: false,
        lastSavedAt: null,
      };

    case 'NAVIGATE_TO_INDEX':
      // Navigate to a specific index in the history
      const targetIndex = action.payload;
      if (targetIndex < 0 || targetIndex >= state.navigationStack.length) {
        // If index is the current diagram index (stack.length), do nothing
        if (targetIndex === state.navigationStack.length) {
          return state;
        }
        return state;
      }
      // Get the target diagram from the stack
      const targetDiagram = state.navigationStack[targetIndex];
      // Slice the stack to keep only items before target
      const newStack = state.navigationStack.slice(0, targetIndex);
      return {
        ...state,
        navigationStack: newStack,
        currentDiagram: targetDiagram,
        isNavigating: false,
        navigationError: null,
        isDirty: false,
        lastSavedAt: null,
      };

    case 'UPDATE_SOURCE':
      if (!state.currentDiagram) {
        return state;
      }
      return {
        ...state,
        currentDiagram: {
          ...state.currentDiagram,
          source: action.payload,
        },
        isDirty: true,
      };

    case 'SET_NAVIGATING':
      return {
        ...state,
        isNavigating: action.payload,
      };

    case 'SET_NAVIGATION_ERROR':
      return {
        ...state,
        navigationError: action.payload,
        isNavigating: false,
      };

    case 'RESET_NAVIGATION':
      if (state.navigationStack.length === 0) {
        return state;
      }
      // Reset to the first diagram (root)
      return {
        ...state,
        navigationStack: [],
        currentDiagram: state.navigationStack[0],
        isNavigating: false,
        navigationError: null,
        isDirty: false,
        lastSavedAt: null,
      };

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload,
      };

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload,
      };

    case 'SET_SAVE_ERROR':
      return {
        ...state,
        saveError: action.payload,
        isSaving: false,
      };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
        lastSavedAt: action.payload,
        saveError: null,
        isSaving: false,
      };

    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        currentDiagram: action.payload.diagram,
        lastSavedAt: action.payload.savedAt,
        isDirty: false,
        navigationStack: [],
      };

    default:
      return state;
  }
}

/**
 * Create the diagram context.
 */
const DiagramContext = createContext<DiagramContextValue | null>(null);

/**
 * Props for the DiagramProvider component.
 */
export interface DiagramProviderProps {
  /** Child components */
  children: ReactNode;
  /** Optional initial diagram */
  initialDiagram?: DiagramEntry;
  /** Whether to persist to localStorage (default: true) */
  persistToLocalStorage?: boolean;
}

/**
 * DiagramProvider component provides diagram navigation state to the component tree.
 *
 * This context manages:
 * - The current diagram being viewed
 * - Navigation stack for breadcrumb/back functionality
 * - Navigation state (loading, errors)
 * - Dirty state tracking for unsaved changes
 * - LocalStorage persistence for offline support
 *
 * @example
 * ```tsx
 * <DiagramProvider initialDiagram={{ id: 'root', title: 'Main', source: '...' }}>
 *   <App />
 * </DiagramProvider>
 * ```
 */
export function DiagramProvider({
  children,
  initialDiagram,
  persistToLocalStorage = true,
}: DiagramProviderProps) {
  // Initialize state with optional initial diagram
  const [state, dispatch] = useReducer(diagramReducer, {
    ...initialState,
    currentDiagram: initialDiagram ?? null,
  });

  /**
   * Save diagram to localStorage.
   */
  const saveToLocalStorage = useCallback(() => {
    if (!persistToLocalStorage || !state.currentDiagram) return;

    try {
      const key = `${STORAGE_KEY_PREFIX}${state.currentDiagram.id}`;
      const data = {
        diagram: state.currentDiagram,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));

      // Also save as current diagram
      localStorage.setItem(CURRENT_DIAGRAM_KEY, state.currentDiagram.id);
    } catch {
      // localStorage might be full or unavailable
    }
  }, [state.currentDiagram, persistToLocalStorage]);

  /**
   * Load diagram from localStorage by ID.
   */
  const loadFromLocalStorage = useCallback(
    (id: string): DiagramEntry | null => {
      if (!persistToLocalStorage) return null;

      try {
        const key = `${STORAGE_KEY_PREFIX}${id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.diagram as DiagramEntry;
        }
      } catch {
        // localStorage might be unavailable or data corrupted
      }
      return null;
    },
    [persistToLocalStorage]
  );

  /**
   * Check if there's a localStorage backup for the current diagram.
   */
  const hasLocalBackup = useCallback((): boolean => {
    if (!persistToLocalStorage || !state.currentDiagram) return false;

    try {
      const key = `${STORAGE_KEY_PREFIX}${state.currentDiagram.id}`;
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }, [state.currentDiagram, persistToLocalStorage]);

  /**
   * Set the root diagram (clears navigation stack).
   */
  const setRootDiagram = useCallback((diagram: DiagramEntry) => {
    dispatch({ type: 'SET_CURRENT_DIAGRAM', payload: diagram });
  }, []);

  /**
   * Navigate to a child diagram (via block click).
   */
  const navigateToChild = useCallback((diagram: DiagramEntry) => {
    dispatch({ type: 'SET_NAVIGATING', payload: true });
    dispatch({ type: 'NAVIGATE_TO_CHILD', payload: diagram });
  }, []);

  /**
   * Navigate back to the parent diagram.
   */
  const navigateBack = useCallback(() => {
    dispatch({ type: 'SET_NAVIGATING', payload: true });
    dispatch({ type: 'NAVIGATE_BACK' });
  }, []);

  /**
   * Navigate to a specific index in the breadcrumb trail.
   */
  const navigateToIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_NAVIGATING', payload: true });
    dispatch({ type: 'NAVIGATE_TO_INDEX', payload: index });
  }, []);

  /**
   * Update the current diagram's source.
   */
  const updateSource = useCallback((source: string) => {
    dispatch({ type: 'UPDATE_SOURCE', payload: source });
  }, []);

  /**
   * Get breadcrumb items for display.
   */
  const getBreadcrumbs = useCallback((): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add all diagrams from the navigation stack
    state.navigationStack.forEach((diagram) => {
      breadcrumbs.push({
        id: diagram.id,
        label: diagram.title,
        isCurrent: false,
      });
    });

    // Add current diagram
    if (state.currentDiagram) {
      breadcrumbs.push({
        id: state.currentDiagram.id,
        label: state.currentDiagram.title,
        isCurrent: true,
      });
    }

    return breadcrumbs;
  }, [state.navigationStack, state.currentDiagram]);

  /**
   * Check if back navigation is possible.
   */
  const canGoBack = useCallback((): boolean => {
    return state.navigationStack.length > 0;
  }, [state.navigationStack.length]);

  /**
   * Get the current diagram depth (0 = root).
   */
  const getCurrentDepth = useCallback((): number => {
    return state.navigationStack.length;
  }, [state.navigationStack.length]);

  /**
   * Clear the navigation error.
   */
  const clearNavigationError = useCallback(() => {
    dispatch({ type: 'SET_NAVIGATION_ERROR', payload: null });
  }, []);

  /**
   * Reset navigation to root.
   */
  const resetNavigation = useCallback(() => {
    dispatch({ type: 'RESET_NAVIGATION' });
  }, []);

  /**
   * Mark the current diagram as dirty.
   */
  const markDirty = useCallback(() => {
    dispatch({ type: 'SET_DIRTY', payload: true });
  }, []);

  /**
   * Mark the current diagram as saved.
   */
  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED', payload: new Date() });
  }, []);

  /**
   * Set saving state.
   */
  const setSaving = useCallback((isSaving: boolean) => {
    dispatch({ type: 'SET_SAVING', payload: isSaving });
  }, []);

  /**
   * Set save error.
   */
  const setSaveError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_SAVE_ERROR', payload: error });
  }, []);

  /**
   * Auto-save to localStorage when dirty state changes.
   */
  useEffect(() => {
    if (state.isDirty && persistToLocalStorage && state.currentDiagram) {
      // Save to localStorage immediately when dirty
      const timeoutId = setTimeout(() => {
        saveToLocalStorage();
      }, 1000); // Debounce localStorage saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [state.isDirty, state.currentDiagram, persistToLocalStorage, saveToLocalStorage]);

  const value: DiagramContextValue = {
    state,
    setRootDiagram,
    navigateToChild,
    navigateBack,
    navigateToIndex,
    updateSource,
    getBreadcrumbs,
    canGoBack,
    getCurrentDepth,
    clearNavigationError,
    resetNavigation,
    markDirty,
    markSaved,
    setSaving,
    setSaveError,
    saveToLocalStorage,
    loadFromLocalStorage,
    hasLocalBackup,
  };

  return (
    <DiagramContext.Provider value={value}>{children}</DiagramContext.Provider>
  );
}

/**
 * Hook to access the diagram context.
 *
 * @throws Error if used outside of DiagramProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, navigateToChild, getBreadcrumbs } = useDiagram();
 *   // ...
 * }
 * ```
 */
export function useDiagram(): DiagramContextValue {
  const context = useContext(DiagramContext);

  if (!context) {
    throw new Error('useDiagram must be used within a DiagramProvider');
  }

  return context;
}

/**
 * Utility function to get the last opened diagram ID from localStorage.
 *
 * @returns The diagram ID or null if not found
 */
export function getLastOpenedDiagramId(): string | null {
  try {
    return localStorage.getItem(CURRENT_DIAGRAM_KEY);
  } catch {
    return null;
  }
}

/**
 * Utility function to list all diagram IDs stored in localStorage.
 *
 * @returns Array of diagram IDs
 */
export function listStoredDiagramIds(): string[] {
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

export default DiagramContext;
