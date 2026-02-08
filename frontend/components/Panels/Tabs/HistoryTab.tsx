'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';

/**
 * Props for the HistoryTab component.
 */
export interface HistoryTabProps {
  /** Currently selected diagram ID */
  diagramId?: string;
  /** Version history list */
  versions?: DiagramVersion[];
  /** Currently active version ID */
  activeVersionId?: string;
  /** Callback when a version is selected for preview */
  onSelectVersion?: (versionId: string) => void;
  /** Callback when a version is restored */
  onRestoreVersion?: (versionId: string) => void;
  /** Callback when a new snapshot is created */
  onCreateSnapshot?: (label?: string) => void;
  /** Whether versions are loading */
  isLoading?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Diagram version structure.
 */
export interface DiagramVersion {
  id: string;
  label?: string;
  createdAt: Date;
  createdBy?: string;
  isAutoSave: boolean;
}

/**
 * Format date for display.
 */
function formatDateTime(date: Date): { date: string; time: string } {
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
 * Group versions by date.
 */
function groupVersionsByDate(versions: DiagramVersion[]): Map<string, DiagramVersion[]> {
  const groups = new Map<string, DiagramVersion[]>();

  versions.forEach((version) => {
    const { date } = formatDateTime(version.createdAt);
    const existing = groups.get(date) || [];
    existing.push(version);
    groups.set(date, existing);
  });

  return groups;
}

/**
 * Version item component.
 */
const VersionItem = memo(function VersionItem({
  version,
  isActive,
  onSelect,
  onRestore,
}: {
  version: DiagramVersion;
  isActive: boolean;
  onSelect: () => void;
  onRestore: () => void;
}) {
  const { time } = formatDateTime(version.createdAt);

  return (
    <div
      className={`
        relative
        pl-6
        py-2
        group
        cursor-pointer
        hover:bg-muted/50
        rounded-r-lg
        transition-colors
        ${isActive ? 'bg-primary/10' : ''}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Timeline dot */}
      <div
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          w-3 h-3
          rounded-full
          border-2
          ${isActive
            ? 'bg-primary border-primary'
            : version.isAutoSave
              ? 'bg-background border-muted-foreground/50'
              : 'bg-primary/20 border-primary'
          }
        `}
      />

      {/* Version info */}
      <div className="flex items-center justify-between pr-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {version.label || time}
            </span>
            {version.isAutoSave && (
              <span className="
                text-[10px]
                px-1.5 py-0.5
                rounded
                bg-muted
                text-muted-foreground
              ">
                Auto
              </span>
            )}
          </div>
          {version.label && (
            <span className="text-xs text-muted-foreground">{time}</span>
          )}
          {version.createdBy && (
            <span className="text-xs text-muted-foreground block">
              by {version.createdBy}
            </span>
          )}
        </div>

        {/* Restore button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          className="
            opacity-0
            group-hover:opacity-100
            px-2 py-1
            text-xs font-medium
            text-primary
            hover:bg-primary/10
            rounded
            transition-all
          "
        >
          Restore
        </button>
      </div>
    </div>
  );
});

/**
 * Create snapshot dialog component.
 */
const CreateSnapshotDialog = memo(function CreateSnapshotDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (label?: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(label.trim() || undefined);
    },
    [label, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3">
      <div>
        <label
          htmlFor="snapshot-label"
          className="text-xs font-medium text-muted-foreground"
        >
          Snapshot Label (optional)
        </label>
        <input
          id="snapshot-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., 'Before refactoring'"
          className="
            mt-1
            w-full
            px-3 py-2
            text-sm
            bg-background
            border border-border
            rounded-lg
            focus:outline-none
            focus:ring-2
            focus:ring-primary/50
            focus:border-primary
            placeholder:text-muted-foreground
          "
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="
            flex-1
            px-3 py-2
            text-sm font-medium
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted
            rounded
            transition-colors
          "
        >
          Cancel
        </button>
        <button
          type="submit"
          className="
            flex-1
            px-3 py-2
            text-sm font-medium
            bg-primary
            text-primary-foreground
            rounded
            hover:bg-primary/90
            transition-colors
          "
        >
          Save Snapshot
        </button>
      </div>
    </form>
  );
});

/**
 * Empty state component.
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="
        w-12 h-12
        rounded-full
        bg-muted
        flex items-center justify-center
        mb-3
      ">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-6 h-6 text-muted-foreground"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">
        No version history
      </h3>
      <p className="text-xs text-muted-foreground">
        Create a snapshot to save the current state.
      </p>
    </div>
  );
});

/**
 * Loading state component.
 */
const LoadingState = memo(function LoadingState() {
  return (
    <div className="space-y-4 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="pl-6 animate-pulse">
          <div className="absolute left-3 w-3 h-3 rounded-full bg-muted" />
          <div className="h-4 bg-muted rounded w-20 mb-1" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  );
});

/**
 * HistoryTab component for displaying and managing diagram version history.
 *
 * Features:
 * - Timeline view of version history
 * - Create named snapshots
 * - Restore to previous versions
 * - Preview versions before restoring
 * - Auto-save indicators
 *
 * @example
 * ```tsx
 * <HistoryTab
 *   diagramId="diagram-123"
 *   versions={versionList}
 *   activeVersionId="version-456"
 *   onSelectVersion={(id) => previewVersion(id)}
 *   onRestoreVersion={(id) => restoreVersion(id)}
 *   onCreateSnapshot={(label) => createSnapshot(label)}
 * />
 * ```
 */
export const HistoryTab = memo(function HistoryTab({
  versions = [],
  activeVersionId,
  onSelectVersion,
  onRestoreVersion,
  onCreateSnapshot,
  isLoading = false,
  className = '',
}: HistoryTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const groupedVersions = groupVersionsByDate(versions);

  const handleSelectVersion = useCallback(
    (versionId: string) => {
      onSelectVersion?.(versionId);
    },
    [onSelectVersion]
  );

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      onRestoreVersion?.(versionId);
    },
    [onRestoreVersion]
  );

  const handleCreateSnapshot = useCallback(
    (label?: string) => {
      onCreateSnapshot?.(label);
      setShowCreateDialog(false);
    },
    [onCreateSnapshot]
  );

  return (
    <div
      className={`
        history-tab
        h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
    >
      {/* Create Snapshot Button */}
      {!showCreateDialog && (
        <div className="p-3 border-b border-border">
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="
              w-full
              flex items-center justify-center gap-2
              px-3 py-2
              text-sm font-medium
              bg-primary
              text-primary-foreground
              rounded-lg
              hover:bg-primary/90
              transition-colors
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create Snapshot
          </button>
        </div>
      )}

      {/* Create Snapshot Dialog */}
      {showCreateDialog && (
        <div className="border-b border-border">
          <CreateSnapshotDialog
            onSubmit={handleCreateSnapshot}
            onCancel={() => setShowCreateDialog(false)}
          />
        </div>
      )}

      {/* Version Timeline */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingState />
        ) : versions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-3">
            {Array.from(groupedVersions.entries()).map(([date, dateVersions]) => (
              <div key={date} className="mb-4">
                {/* Date header */}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {date}
                </div>

                {/* Timeline */}
                <div className="relative border-l-2 border-border ml-1.5">
                  {dateVersions.map((version) => (
                    <VersionItem
                      key={version.id}
                      version={version}
                      isActive={version.id === activeVersionId}
                      onSelect={() => handleSelectVersion(version.id)}
                      onRestore={() => handleRestoreVersion(version.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default HistoryTab;
