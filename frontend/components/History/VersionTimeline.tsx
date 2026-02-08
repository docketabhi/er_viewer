'use client';

import {
  memo,
  useMemo,
  useCallback,
} from 'react';
import { VersionItem, formatDateTime, type DiagramVersion } from './VersionItem';

/**
 * Props for the VersionTimeline component.
 */
export interface VersionTimelineProps {
  /** List of versions to display */
  versions: DiagramVersion[];
  /** Currently active/selected version ID */
  activeVersionId?: string;
  /** Callback when a version is selected for preview */
  onSelectVersion: (version: DiagramVersion) => void;
  /** Callback when a version is restored */
  onRestoreVersion: (version: DiagramVersion) => void;
  /** Optional callback for deleting a version */
  onDeleteVersion?: (version: DiagramVersion) => void;
  /** Version ID currently being restored */
  restoringVersionId?: string;
  /** Whether to show date group headers */
  showDateGroups?: boolean;
  /** Maximum number of versions to display (0 = unlimited) */
  maxVersions?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Group versions by date for timeline display.
 *
 * @param versions - Array of versions to group
 * @returns Map of date strings to arrays of versions
 */
export function groupVersionsByDate(versions: DiagramVersion[]): Map<string, DiagramVersion[]> {
  const groups = new Map<string, DiagramVersion[]>();

  // Sort versions by creation date (newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  sortedVersions.forEach((version) => {
    const { date } = formatDateTime(version.createdAt);
    const existing = groups.get(date) || [];
    existing.push(version);
    groups.set(date, existing);
  });

  return groups;
}

/**
 * Empty state component shown when no versions exist.
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
          aria-hidden="true"
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
    <div className="space-y-4 p-3" aria-label="Loading version history">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative pl-6 animate-pulse">
          <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-muted" />
          <div className="h-4 bg-muted rounded w-20 mb-1" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  );
});

/**
 * Date group header component.
 */
const DateGroupHeader = memo(function DateGroupHeader({
  date,
  count,
}: {
  date: string;
  count: number;
}) {
  return (
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
      <span>{date}</span>
      <span className="text-muted-foreground/70">{count}</span>
    </div>
  );
});

/**
 * VersionTimeline component displays a chronological list of diagram versions
 * grouped by date with a visual timeline indicator.
 *
 * Features:
 * - Versions grouped by date (Today, Yesterday, etc.)
 * - Visual timeline with connected dots
 * - Click to select/preview a version
 * - Restore button on hover
 * - Loading and empty states
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <VersionTimeline
 *   versions={[
 *     { id: 'v1', createdAt: new Date(), isAutoSave: false },
 *     { id: 'v2', createdAt: new Date(), isAutoSave: true, label: 'Before refactoring' },
 *   ]}
 *   activeVersionId="v1"
 *   onSelectVersion={(v) => previewVersion(v)}
 *   onRestoreVersion={(v) => restoreToVersion(v)}
 * />
 * ```
 */
export const VersionTimeline = memo(function VersionTimeline({
  versions,
  activeVersionId,
  onSelectVersion,
  onRestoreVersion,
  onDeleteVersion,
  restoringVersionId,
  showDateGroups = true,
  maxVersions = 0,
  className = '',
}: VersionTimelineProps) {
  // Limit versions if maxVersions is set
  const displayedVersions = useMemo(() => {
    if (maxVersions > 0 && versions.length > maxVersions) {
      return versions.slice(0, maxVersions);
    }
    return versions;
  }, [versions, maxVersions]);

  // Group versions by date
  const groupedVersions = useMemo(
    () => groupVersionsByDate(displayedVersions),
    [displayedVersions]
  );

  /**
   * Handle version selection.
   */
  const handleSelectVersion = useCallback(
    (version: DiagramVersion) => {
      onSelectVersion(version);
    },
    [onSelectVersion]
  );

  /**
   * Handle version restore.
   */
  const handleRestoreVersion = useCallback(
    (version: DiagramVersion) => {
      onRestoreVersion(version);
    },
    [onRestoreVersion]
  );

  /**
   * Handle version delete.
   */
  const handleDeleteVersion = useCallback(
    (version: DiagramVersion) => {
      onDeleteVersion?.(version);
    },
    [onDeleteVersion]
  );

  // Empty state
  if (versions.length === 0) {
    return <EmptyState />;
  }

  // Render date groups with timeline
  const dateGroups = Array.from(groupedVersions.entries());

  return (
    <div
      className={`version-timeline ${className}`}
      role="listbox"
      aria-label="Version history"
    >
      {dateGroups.map(([date, dateVersions], groupIndex) => (
        <div key={date} className="mb-4 last:mb-0">
          {/* Date header */}
          {showDateGroups && (
            <DateGroupHeader date={date} count={dateVersions.length} />
          )}

          {/* Timeline container */}
          <div className="relative border-l-2 border-border ml-1.5">
            {dateVersions.map((version, versionIndex) => (
              <VersionItem
                key={version.id}
                version={version}
                isActive={version.id === activeVersionId}
                onSelect={handleSelectVersion}
                onRestore={handleRestoreVersion}
                onDelete={onDeleteVersion ? handleDeleteVersion : undefined}
                isRestoring={version.id === restoringVersionId}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Show more indicator */}
      {maxVersions > 0 && versions.length > maxVersions && (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground">
            + {versions.length - maxVersions} more versions
          </span>
        </div>
      )}
    </div>
  );
});

export { LoadingState as VersionTimelineLoading };
export type { DiagramVersion };
export default VersionTimeline;
