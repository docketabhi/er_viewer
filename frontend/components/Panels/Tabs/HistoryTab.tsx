'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';
import {
  VersionTimeline,
  VersionTimelineLoading,
  type DiagramVersion,
} from '@/components/History';

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
  /** Callback when a version is deleted */
  onDeleteVersion?: (versionId: string) => void;
  /** Callback when a new snapshot is created */
  onCreateSnapshot?: (label?: string) => void;
  /** Whether versions are loading */
  isLoading?: boolean;
  /** ID of version currently being restored */
  restoringVersionId?: string;
  /** Current source content for diff comparison in preview */
  currentSource?: string;
  /** Whether to enable the preview modal (default: true) */
  enablePreview?: boolean;
  /** Additional CSS class */
  className?: string;
}

// Re-export DiagramVersion type for consumers
export type { DiagramVersion };

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

  /**
   * Handle keyboard shortcut for quick submit.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSubmit(label.trim() || undefined);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [label, onSubmit, onCancel]
  );

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-3" onKeyDown={handleKeyDown}>
      <div>
        <label
          htmlFor="snapshot-label"
          className="text-xs font-medium text-muted-foreground block mb-1"
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
        <p className="mt-1 text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Ctrl+Enter</kbd> to save
        </p>
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
            focus:outline-none
            focus:ring-2
            focus:ring-primary/50
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
            focus:outline-none
            focus:ring-2
            focus:ring-primary/50
          "
        >
          Save Snapshot
        </button>
      </div>
    </form>
  );
});

/**
 * Plus icon component.
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

/**
 * HistoryTab component for displaying and managing diagram version history.
 *
 * Features:
 * - Timeline view of version history grouped by date
 * - Create named snapshots
 * - Restore to previous versions
 * - Preview versions before restoring
 * - Auto-save indicators
 * - Loading and empty states
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
  onDeleteVersion,
  onCreateSnapshot,
  isLoading = false,
  restoringVersionId,
  currentSource,
  enablePreview = true,
  className = '',
}: HistoryTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  /**
   * Handle version selection for preview.
   */
  const handleSelectVersion = useCallback(
    (version: DiagramVersion) => {
      onSelectVersion?.(version.id);
    },
    [onSelectVersion]
  );

  /**
   * Handle version restore.
   */
  const handleRestoreVersion = useCallback(
    (version: DiagramVersion) => {
      onRestoreVersion?.(version.id);
    },
    [onRestoreVersion]
  );

  /**
   * Handle version deletion.
   */
  const handleDeleteVersion = useCallback(
    (version: DiagramVersion) => {
      onDeleteVersion?.(version.id);
    },
    [onDeleteVersion]
  );

  /**
   * Handle snapshot creation.
   */
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
              focus:outline-none
              focus:ring-2
              focus:ring-primary/50
            "
          >
            <PlusIcon className="w-4 h-4" />
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
          <div className="p-3">
            <VersionTimelineLoading />
          </div>
        ) : (
          <div className="p-3">
            <VersionTimeline
              versions={versions}
              activeVersionId={activeVersionId}
              onSelectVersion={handleSelectVersion}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={onDeleteVersion ? handleDeleteVersion : undefined}
              restoringVersionId={restoringVersionId}
              currentSource={currentSource}
              enablePreview={enablePreview}
              showDateGroups
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default HistoryTab;
