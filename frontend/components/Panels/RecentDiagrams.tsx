'use client';

import {
  useState,
  useCallback,
  memo,
  type KeyboardEvent,
} from 'react';

/**
 * Represents a recent diagram entry.
 */
export interface RecentDiagram {
  /** Unique identifier */
  id: string;
  /** Diagram title */
  title: string;
  /** Last modified/accessed timestamp */
  timestamp: string;
  /** Optional thumbnail URL or preview data */
  thumbnail?: string;
  /** Number of entities in the diagram */
  entityCount?: number;
  /** Whether the diagram has unsaved changes */
  isDirty?: boolean;
}

/**
 * Props for the RecentDiagrams component.
 */
export interface RecentDiagramsProps {
  /** List of recent diagrams */
  diagrams: RecentDiagram[];
  /** ID of the currently active diagram */
  activeId?: string;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Callback when a diagram is selected */
  onSelect?: (diagram: RecentDiagram) => void;
  /** Callback when a diagram is removed from recents */
  onRemove?: (diagram: RecentDiagram) => void;
  /** Callback to clear all recent diagrams */
  onClearAll?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Whether to show the clear all button */
  showClearAll?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Format a timestamp for display.
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Props for a single recent diagram item.
 */
interface RecentDiagramItemProps {
  diagram: RecentDiagram;
  isActive: boolean;
  onSelect?: (diagram: RecentDiagram) => void;
  onRemove?: (diagram: RecentDiagram) => void;
}

/**
 * Single recent diagram item component.
 */
const RecentDiagramItem = memo(function RecentDiagramItem({
  diagram,
  isActive,
  onSelect,
  onRemove,
}: RecentDiagramItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  /**
   * Handle item click.
   */
  const handleClick = useCallback(() => {
    onSelect?.(diagram);
  }, [diagram, onSelect]);

  /**
   * Handle remove button click.
   */
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.(diagram);
    },
    [diagram, onRemove]
  );

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemove?.(diagram);
      }
    },
    [handleClick, onRemove, diagram]
  );

  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        recent-diagram-item
        flex items-center gap-2
        px-2 py-1.5
        rounded
        cursor-pointer
        transition-colors
        group
        ${isActive
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }
      `}
    >
      {/* Diagram icon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-blue-500'}`}
        >
          <path
            fillRule="evenodd"
            d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Diagram info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm truncate">{diagram.title}</span>
          {diagram.isDirty && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(diagram.timestamp)}</span>
          {diagram.entityCount !== undefined && (
            <>
              <span>·</span>
              <span>{diagram.entityCount} entities</span>
            </>
          )}
        </div>
      </div>

      {/* Remove button (shown on hover) */}
      {onRemove && (isHovered || isActive) && (
        <button
          type="button"
          onClick={handleRemove}
          className="
            flex-shrink-0
            p-1
            rounded
            text-muted-foreground
            hover:text-red-500
            hover:bg-red-500/10
            focus:outline-none
            focus:ring-2
            focus:ring-primary/50
            transition-colors
          "
          aria-label={`Remove ${diagram.title} from recent diagrams`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

/**
 * RecentDiagrams component for displaying a list of recently accessed diagrams.
 *
 * Features:
 * - Time-based grouping (just now, today, this week)
 * - Remove individual items
 * - Clear all functionality
 * - Keyboard navigation
 * - Visual indicators for dirty/unsaved items
 *
 * @example
 * ```tsx
 * <RecentDiagrams
 *   diagrams={[
 *     { id: '1', title: 'Customer Flow', timestamp: '2024-01-15T10:30:00Z' },
 *     { id: '2', title: 'Order System', timestamp: '2024-01-14T09:00:00Z' },
 *   ]}
 *   onSelect={(diagram) => openDiagram(diagram.id)}
 *   onRemove={(diagram) => removeFromRecent(diagram.id)}
 * />
 * ```
 */
export const RecentDiagrams = memo(function RecentDiagrams({
  diagrams,
  activeId,
  maxItems = 10,
  onSelect,
  onRemove,
  onClearAll,
  className = '',
  isLoading = false,
  showClearAll = true,
  emptyMessage = 'No recent diagrams',
}: RecentDiagramsProps) {
  // Limit the displayed items
  const displayedDiagrams = diagrams.slice(0, maxItems);

  // Loading state
  if (isLoading) {
    return (
      <div className={`recent-diagrams ${className}`}>
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Empty state
  if (diagrams.length === 0) {
    return (
      <div className={`recent-diagrams ${className}`}>
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-8 h-8 mb-2 opacity-50"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`recent-diagrams ${className}`}>
      {/* Header with optional clear all button */}
      {showClearAll && diagrams.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Recent ({diagrams.length})
          </span>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="
                text-xs
                text-muted-foreground
                hover:text-red-500
                transition-colors
              "
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Diagram list */}
      <div role="listbox" aria-label="Recent diagrams" className="space-y-0.5">
        {displayedDiagrams.map((diagram) => (
          <RecentDiagramItem
            key={diagram.id}
            diagram={diagram}
            isActive={activeId === diagram.id}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {diagrams.length > maxItems && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            + {diagrams.length - maxItems} more
          </span>
        </div>
      )}
    </div>
  );
});

export default RecentDiagrams;
