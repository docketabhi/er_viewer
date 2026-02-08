'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { BlockDirective } from '@/lib/mermaid/types';

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
  | { type: 'RESET_NAVIGATION' };

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
}

/**
 * Initial state for the diagram context.
 */
const initialState: DiagramState = {
  currentDiagram: null,
  navigationStack: [],
  isNavigating: false,
  navigationError: null,
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
      };

    case 'NAVIGATE_TO_CHILD':
      // Push current diagram to stack and set new current
      if (!state.currentDiagram) {
        return {
          ...state,
          currentDiagram: action.payload,
          navigationError: null,
        };
      }
      return {
        ...state,
        navigationStack: [...state.navigationStack, state.currentDiagram],
        currentDiagram: action.payload,
        isNavigating: false,
        navigationError: null,
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
}

/**
 * DiagramProvider component provides diagram navigation state to the component tree.
 *
 * This context manages:
 * - The current diagram being viewed
 * - Navigation stack for breadcrumb/back functionality
 * - Navigation state (loading, errors)
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
}: DiagramProviderProps) {
  // Initialize state with optional initial diagram
  const [state, dispatch] = useReducer(diagramReducer, {
    ...initialState,
    currentDiagram: initialDiagram ?? null,
  });

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
    state.navigationStack.forEach((diagram, index) => {
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

export default DiagramContext;
