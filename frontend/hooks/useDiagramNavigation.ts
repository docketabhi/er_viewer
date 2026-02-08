'use client';

import { useCallback, useMemo } from 'react';
import { useDiagram, type DiagramEntry } from '@/contexts/DiagramContext';
import type { BlockDirective } from '@/lib/mermaid/types';

/**
 * Options for diagram navigation.
 */
export interface NavigationOptions {
  /** Callback to fetch a diagram by ID (for loading child diagrams) */
  onFetchDiagram?: (diagramId: string) => Promise<DiagramEntry | null>;
  /** Callback fired when navigation starts */
  onNavigationStart?: (targetId: string) => void;
  /** Callback fired when navigation completes */
  onNavigationComplete?: (diagram: DiagramEntry) => void;
  /** Callback fired when navigation fails */
  onNavigationError?: (error: Error, diagramId: string) => void;
}

/**
 * Return type for the useDiagramNavigation hook.
 */
export interface DiagramNavigationResult {
  /** The current diagram being viewed */
  currentDiagram: DiagramEntry | null;
  /** The Mermaid source of the current diagram */
  currentSource: string;
  /** Whether navigation is in progress */
  isNavigating: boolean;
  /** Current navigation error (if any) */
  navigationError: string | null;
  /** Navigate to a child diagram via block click */
  handleBlockClick: (block: BlockDirective, event?: MouseEvent | React.MouseEvent) => void;
  /** Navigate back to parent */
  goBack: () => void;
  /** Navigate to a specific breadcrumb index */
  goToIndex: (index: number) => void;
  /** Update the current diagram source (for editor changes) */
  setSource: (source: string) => void;
  /** Set the root diagram */
  setDiagram: (diagram: DiagramEntry) => void;
  /** Check if back navigation is available */
  canGoBack: boolean;
  /** Current depth in the navigation stack */
  depth: number;
  /** Breadcrumb items for navigation display */
  breadcrumbs: Array<{
    id: string;
    label: string;
    isCurrent: boolean;
  }>;
  /** Reset navigation to root */
  resetToRoot: () => void;
  /** Clear any navigation error */
  clearError: () => void;
}

/**
 * Default diagram source for new/empty diagrams.
 */
const DEFAULT_CHILD_SOURCE = `erDiagram
    %% Add your entities and relationships here
`;

/**
 * Hook for managing diagram navigation with block drill-down support.
 *
 * This hook provides a simplified API for navigating between diagrams
 * using block directives. It wraps the DiagramContext and provides
 * handlers for common navigation actions.
 *
 * @param options - Navigation options including fetch callback
 * @returns Navigation state and handlers
 *
 * @example
 * ```tsx
 * function DiagramViewer() {
 *   const {
 *     currentSource,
 *     handleBlockClick,
 *     goBack,
 *     breadcrumbs,
 *     canGoBack,
 *   } = useDiagramNavigation({
 *     onFetchDiagram: async (id) => {
 *       const response = await fetch(`/api/diagrams/${id}`);
 *       return response.json();
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <Breadcrumb items={breadcrumbs} />
 *       <MermaidPreview
 *         source={currentSource}
 *         onBlockClick={handleBlockClick}
 *       />
 *       {canGoBack && <button onClick={goBack}>Back</button>}
 *     </>
 *   );
 * }
 * ```
 */
export function useDiagramNavigation(
  options: NavigationOptions = {}
): DiagramNavigationResult {
  const {
    onFetchDiagram,
    onNavigationStart,
    onNavigationComplete,
    onNavigationError,
  } = options;

  const {
    state,
    setRootDiagram,
    navigateToChild,
    navigateBack,
    navigateToIndex,
    updateSource,
    getBreadcrumbs,
    canGoBack: contextCanGoBack,
    getCurrentDepth,
    clearNavigationError,
    resetNavigation,
  } = useDiagram();

  /**
   * Handle block badge click for navigation.
   * Fetches the child diagram and navigates to it.
   */
  const handleBlockClick = useCallback(
    async (block: BlockDirective, event?: MouseEvent | React.MouseEvent) => {
      // Prevent event propagation
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      const targetId = block.childDiagramId;

      // Notify that navigation is starting
      onNavigationStart?.(targetId);

      try {
        let childDiagram: DiagramEntry | null = null;

        // Try to fetch the diagram if a fetch function is provided
        if (onFetchDiagram) {
          childDiagram = await onFetchDiagram(targetId);
        }

        // If no fetch function or diagram not found, create a placeholder
        if (!childDiagram) {
          childDiagram = {
            id: targetId,
            title: block.label || `${block.entityKey} Details`,
            source: DEFAULT_CHILD_SOURCE,
            fromBlock: block,
            parentId: state.currentDiagram?.id,
          };
        }

        // Navigate to the child diagram
        navigateToChild(childDiagram);

        // Notify that navigation completed
        onNavigationComplete?.(childDiagram);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onNavigationError?.(error, targetId);
      }
    },
    [
      state.currentDiagram?.id,
      onFetchDiagram,
      onNavigationStart,
      onNavigationComplete,
      onNavigationError,
      navigateToChild,
    ]
  );

  /**
   * Navigate back to the parent diagram.
   */
  const goBack = useCallback(() => {
    if (contextCanGoBack()) {
      navigateBack();
    }
  }, [contextCanGoBack, navigateBack]);

  /**
   * Navigate to a specific index in the breadcrumb trail.
   */
  const goToIndex = useCallback(
    (index: number) => {
      navigateToIndex(index);
    },
    [navigateToIndex]
  );

  /**
   * Update the current diagram's source.
   */
  const setSource = useCallback(
    (source: string) => {
      updateSource(source);
    },
    [updateSource]
  );

  /**
   * Set the root diagram.
   */
  const setDiagram = useCallback(
    (diagram: DiagramEntry) => {
      setRootDiagram(diagram);
    },
    [setRootDiagram]
  );

  /**
   * Reset to the root diagram.
   */
  const resetToRoot = useCallback(() => {
    resetNavigation();
  }, [resetNavigation]);

  /**
   * Clear any navigation error.
   */
  const clearError = useCallback(() => {
    clearNavigationError();
  }, [clearNavigationError]);

  // Memoized values
  const currentSource = useMemo(
    () => state.currentDiagram?.source ?? '',
    [state.currentDiagram?.source]
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(), [getBreadcrumbs]);

  const canGoBack = useMemo(() => contextCanGoBack(), [contextCanGoBack]);

  const depth = useMemo(() => getCurrentDepth(), [getCurrentDepth]);

  return {
    currentDiagram: state.currentDiagram,
    currentSource,
    isNavigating: state.isNavigating,
    navigationError: state.navigationError,
    handleBlockClick,
    goBack,
    goToIndex,
    setSource,
    setDiagram,
    canGoBack,
    depth,
    breadcrumbs,
    resetToRoot,
    clearError,
  };
}

export default useDiagramNavigation;
