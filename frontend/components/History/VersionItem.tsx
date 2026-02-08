'use client';

import {
  memo,
  useCallback,
  type KeyboardEvent,
} from 'react';

/**
 * Diagram version structure.
 */
export interface DiagramVersion {
  /** Unique version identifier */
  id: string;
  /** Optional user-defined label for the version */
  label?: string;
  /** When the version was created */
  createdAt: Date;
  /** User who created the version */
  createdBy?: string;
  /** Whether this was an auto-save vs manual snapshot */
  isAutoSave: boolean;
  /** The Mermaid source content at this version (for preview) */
  mermaidSource?: string;
}

/**
 * Props for the VersionItem component.
 */
export interface VersionItemProps {
  /** The version to display */
  version: DiagramVersion;
  /** Whether this version is currently active/selected */
  isActive: boolean;
  /** Callback when the version is selected for preview */
  onSelect: (version: DiagramVersion) => void;
  /** Callback when the version is restored */
  onRestore: (version: DiagramVersion) => void;
  /** Optional callback for delete action */
  onDelete?: (version: DiagramVersion) => void;
  /** Whether restore is in progress */
  isRestoring?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Format date for display in version timeline.
 *
 * Returns relative dates for recent items (Today, Yesterday, weekday names)
 * and absolute dates for older items.
 */
export function formatDateTime(date: Date): { date: string; time: string } {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  let dateStr: string;
  if (diffDays === 0) {
    dateStr = 'Today';
  } else if (diffDays === 1) {
    dateStr = 'Yesterday';
  } else if (diffDays < 7) {
    dateStr = date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { date: dateStr, time: timeStr };
}

/**
 * Clock icon for timestamps.
 */
function ClockIcon({ className }: { className?: string }) {
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
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * VersionItem component displays a single version in the history timeline.
 *
 * Features:
 * - Timeline dot styling based on active/auto-save status
 * - Time display with optional label
 * - User attribution
 * - Restore button on hover
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <VersionItem
 *   version={{
 *     id: 'v1',
 *     label: 'Before refactoring',
 *     createdAt: new Date(),
 *     createdBy: 'John',
 *     isAutoSave: false,
 *   }}
 *   isActive={false}
 *   onSelect={(v) => previewVersion(v)}
 *   onRestore={(v) => restoreVersion(v)}
 * />
 * ```
 */
export const VersionItem = memo(function VersionItem({
  version,
  isActive,
  onSelect,
  onRestore,
  onDelete,
  isRestoring = false,
  className = '',
}: VersionItemProps) {
  const { time } = formatDateTime(version.createdAt);

  /**
   * Handle version selection.
   */
  const handleSelect = useCallback(() => {
    onSelect(version);
  }, [version, onSelect]);

  /**
   * Handle restore button click.
   */
  const handleRestore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isRestoring) {
        onRestore(version);
      }
    },
    [version, onRestore, isRestoring]
  );

  /**
   * Handle delete button click.
   */
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(version);
    },
    [version, onDelete]
  );

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect]
  );

  return (
    <div
      className={`
        version-item
        relative
        pl-6
        py-2
        group
        cursor-pointer
        hover:bg-muted/50
        rounded-r-lg
        transition-colors
        ${isActive ? 'bg-primary/10' : ''}
        ${className}
      `}
      onClick={handleSelect}
      role="option"
      tabIndex={0}
      aria-selected={isActive}
      onKeyDown={handleKeyDown}
    >
      {/* Timeline dot */}
      <div
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          w-3 h-3
          rounded-full
          border-2
          transition-all
          ${isActive
            ? 'bg-primary border-primary scale-125'
            : version.isAutoSave
              ? 'bg-background border-muted-foreground/50'
              : 'bg-primary/20 border-primary'
          }
        `}
        aria-hidden="true"
      />

      {/* Version info */}
      <div className="flex items-center justify-between pr-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Label or time as primary text */}
            <span className="text-sm font-medium text-foreground truncate">
              {version.label || time}
            </span>

            {/* Auto-save badge */}
            {version.isAutoSave && (
              <span className="
                flex-shrink-0
                text-[10px]
                px-1.5 py-0.5
                rounded
                bg-muted
                text-muted-foreground
                font-medium
              ">
                Auto
              </span>
            )}
          </div>

          {/* Secondary info row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Show time below label if label exists */}
            {version.label && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="w-3 h-3" />
                {time}
              </span>
            )}

            {/* User attribution */}
            {version.createdBy && (
              <>
                {version.label && <span className="text-muted-foreground">·</span>}
                <span className="text-xs text-muted-foreground truncate">
                  by {version.createdBy}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons (shown on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Restore button */}
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className={`
              px-2 py-1
              text-xs font-medium
              text-primary
              hover:bg-primary/10
              rounded
              transition-all
              focus:outline-none
              focus:ring-2
              focus:ring-primary/50
              ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={`Restore to version ${version.label || version.id}`}
          >
            {isRestoring ? 'Restoring...' : 'Restore'}
          </button>

          {/* Delete button (optional) */}
          {onDelete && !version.isAutoSave && (
            <button
              type="button"
              onClick={handleDelete}
              className="
                p-1
                text-muted-foreground
                hover:text-red-500
                hover:bg-red-500/10
                rounded
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-red-500/50
              "
              aria-label={`Delete version ${version.label || version.id}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default VersionItem;
