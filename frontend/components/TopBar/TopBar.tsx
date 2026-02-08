'use client';

import { memo, useCallback, type ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ShareButton, type ShareMode } from './ShareButton';
import { ExportButton, type ExportFormat } from './ExportButton';
import { PresenceAvatars, type PresenceUser } from './PresenceAvatars';

/**
 * Props for the TopBar component.
 */
export interface TopBarProps {
  /** Application/diagram title */
  title?: string;
  /** Whether the title is editable */
  titleEditable?: boolean;
  /** Callback when title changes */
  onTitleChange?: (title: string) => void;
  /** Current diagram ID (for sharing) */
  diagramId?: string;
  /** Whether the diagram has been saved */
  isSaved?: boolean;
  /** Whether the diagram has unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Callback when share link is copied */
  onShareLinkCopied?: (link: string, mode: ShareMode) => void;
  /** Callback when share settings are opened */
  onShareSettingsOpen?: () => void;
  /** Callback when export is requested */
  onExport?: (format: ExportFormat) => void;
  /** Whether export is in progress */
  isExporting?: boolean;
  /** Enabled export formats */
  enabledExportFormats?: ExportFormat[];
  /** Users currently present */
  presenceUsers?: PresenceUser[];
  /** Current user ID */
  currentUserId?: string;
  /** Callback when a presence avatar is clicked */
  onPresenceUserClick?: (user: PresenceUser) => void;
  /** Content to render on the left side of the top bar */
  leftContent?: ReactNode;
  /** Content to render in the center (replaces title) */
  centerContent?: ReactNode;
  /** Content to render on the right side (before default actions) */
  rightContent?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Logo/home icon component.
 */
function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Entity box 1 */}
      <rect x="2" y="3" width="8" height="6" rx="1" />
      {/* Entity box 2 */}
      <rect x="14" y="3" width="8" height="6" rx="1" />
      {/* Entity box 3 */}
      <rect x="8" y="15" width="8" height="6" rx="1" />
      {/* Relationship lines */}
      <line x1="6" y1="9" x2="6" y2="12" />
      <line x1="6" y1="12" x2="12" y2="12" />
      <line x1="12" y1="12" x2="12" y2="15" />
      <line x1="18" y1="9" x2="18" y2="12" />
      <line x1="18" y1="12" x2="12" y2="12" />
    </svg>
  );
}

/**
 * Editable title component.
 */
const EditableTitle = memo(function EditableTitle({
  title,
  editable,
  hasUnsavedChanges,
  onChange,
}: {
  title: string;
  editable: boolean;
  hasUnsavedChanges: boolean;
  onChange?: (title: string) => void;
}) {
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newTitle = e.target.value.trim();
      if (newTitle && newTitle !== title) {
        onChange?.(newTitle);
      }
    },
    [title, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        e.currentTarget.value = title;
        e.currentTarget.blur();
      }
    },
    [title]
  );

  if (editable) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          defaultValue={title}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="
            title-input
            px-2 py-1
            bg-transparent
            border border-transparent
            rounded
            text-foreground font-semibold
            hover:border-border
            focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
            transition-colors
          "
          aria-label="Diagram title"
        />
        {hasUnsavedChanges && (
          <span
            className="w-2 h-2 bg-amber-500 rounded-full"
            title="Unsaved changes"
            aria-label="Unsaved changes"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <h1 className="text-foreground font-semibold truncate max-w-[200px]">
        {title}
      </h1>
      {hasUnsavedChanges && (
        <span
          className="w-2 h-2 bg-amber-500 rounded-full"
          title="Unsaved changes"
          aria-label="Unsaved changes"
        />
      )}
    </div>
  );
});

/**
 * TopBar component for the application header.
 *
 * Features:
 * - Logo and application title
 * - Editable diagram title with unsaved changes indicator
 * - Share button with link copying
 * - Export button with format options
 * - Theme toggle for light/dark mode
 * - Presence avatars for collaboration
 * - Customizable left/center/right content areas
 *
 * @example
 * ```tsx
 * <TopBar
 *   title="My Diagram"
 *   titleEditable
 *   onTitleChange={(title) => setTitle(title)}
 *   diagramId="abc123"
 *   isSaved
 *   onExport={(format) => handleExport(format)}
 *   presenceUsers={users}
 * />
 * ```
 */
export const TopBar = memo(function TopBar({
  title = 'Untitled Diagram',
  titleEditable = false,
  onTitleChange,
  diagramId,
  isSaved = false,
  hasUnsavedChanges = false,
  onShareLinkCopied,
  onShareSettingsOpen,
  onExport,
  isExporting = false,
  enabledExportFormats,
  presenceUsers = [],
  currentUserId,
  onPresenceUserClick,
  leftContent,
  centerContent,
  rightContent,
  className = '',
}: TopBarProps) {
  return (
    <div
      className={`
        top-bar
        flex items-center justify-between
        h-12 px-4
        bg-background
        border-b border-border
        ${className}
      `}
    >
      {/* Left section: Logo and title */}
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
        {/* Logo */}
        <a
          href="/"
          className="
            flex items-center gap-2
            text-foreground
            hover:text-primary
            transition-colors
          "
          title="ER Viewer Home"
        >
          <LogoIcon className="w-6 h-6" />
          <span className="font-bold text-lg hidden sm:inline">ER Viewer</span>
        </a>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Custom left content or title */}
        {leftContent || (
          centerContent ? null : (
            <EditableTitle
              title={title}
              editable={titleEditable}
              hasUnsavedChanges={hasUnsavedChanges}
              onChange={onTitleChange}
            />
          )
        )}
      </div>

      {/* Center section */}
      {centerContent && (
        <div className="flex-1 flex items-center justify-center min-w-0 px-4">
          {centerContent}
        </div>
      )}

      {/* Right section: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Custom right content */}
        {rightContent}

        {/* Presence avatars */}
        {presenceUsers.length > 0 && (
          <>
            <PresenceAvatars
              users={presenceUsers}
              currentUserId={currentUserId}
              onUserClick={onPresenceUserClick}
              size="sm"
              maxVisible={4}
            />
            <div className="h-6 w-px bg-border" />
          </>
        )}

        {/* Export button */}
        <ExportButton
          onExport={onExport}
          diagramTitle={title}
          isExporting={isExporting}
          enabledFormats={enabledExportFormats}
          size="md"
        />

        {/* Share button */}
        <ShareButton
          diagramId={diagramId}
          isSaved={isSaved}
          onShareLinkCopied={onShareLinkCopied}
          onShareSettingsOpen={onShareSettingsOpen}
          size="md"
        />

        {/* Theme toggle */}
        <ThemeToggle size="md" />
      </div>
    </div>
  );
});

export default TopBar;
