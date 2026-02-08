'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';
import { DocsTab } from './Tabs/DocsTab';
import { SnippetsTab } from './Tabs/SnippetsTab';
import { CommentsTab, type Comment } from './Tabs/CommentsTab';
import { HistoryTab, type DiagramVersion } from './Tabs/HistoryTab';
import { SettingsTab, type DiagramSettings } from './Tabs/SettingsTab';

/**
 * Tab options for the right panel.
 */
export type RightPanelTab = 'docs' | 'snippets' | 'comments' | 'history' | 'settings';

/**
 * Tab configuration.
 */
interface TabConfig {
  id: RightPanelTab;
  label: string;
  icon: React.ReactNode;
}

/**
 * Tab configurations with icons.
 */
const TABS: TabConfig[] = [
  {
    id: 'docs',
    label: 'Docs',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM6 13.25V3.5h8v9.75a.75.75 0 01-1.064.681L10 12.576l-2.936 1.355A.75.75 0 016 13.25z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'snippets',
    label: 'Snippets',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'comments',
    label: 'Comments',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.579a.78.78 0 01.527-.224 41.202 41.202 0 005.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

/**
 * Props for the RightPanel component.
 */
export interface RightPanelProps {
  /** Currently selected diagram ID */
  diagramId?: string;
  /** Comments list */
  comments?: Comment[];
  /** Version history list */
  versions?: DiagramVersion[];
  /** Current settings */
  settings?: DiagramSettings;
  /** Current user ID */
  currentUserId?: string;
  /** Active version ID for history */
  activeVersionId?: string;
  /** Current source content for diff comparison in version preview */
  currentSource?: string;
  /** Callback when a snippet is inserted */
  onInsertSnippet?: (snippet: string) => void;
  /** Callback when a comment is added */
  onAddComment?: (content: string) => void;
  /** Callback when a comment is deleted */
  onDeleteComment?: (commentId: string) => void;
  /** Callback when a comment is resolved/unresolved */
  onToggleCommentResolved?: (commentId: string, resolved: boolean) => void;
  /** Callback when a version is selected */
  onSelectVersion?: (versionId: string) => void;
  /** Callback when a version is restored */
  onRestoreVersion?: (versionId: string) => void;
  /** Callback when a snapshot is created */
  onCreateSnapshot?: (label?: string) => void;
  /** Callback when settings change */
  onSettingsChange?: (settings: Partial<DiagramSettings>) => void;
  /** Whether comments are loading */
  isCommentsLoading?: boolean;
  /** Whether history is loading */
  isHistoryLoading?: boolean;
  /** Default active tab */
  defaultTab?: RightPanelTab;
  /** Additional CSS class */
  className?: string;
}

/**
 * Tab button component with icon.
 */
const TabButton = memo(function TabButton({
  tab,
  isActive,
  onClick,
  badge,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative
        flex items-center justify-center gap-1.5
        px-2 py-2
        text-xs font-medium
        border-b-2
        transition-colors
        ${isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
        }
      `}
      title={tab.label}
    >
      {tab.icon}
      <span className="hidden sm:inline">{tab.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="
          absolute -top-1 -right-1
          min-w-[16px] h-4
          flex items-center justify-center
          text-[10px] font-medium
          bg-primary text-primary-foreground
          rounded-full
          px-1
        ">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
});

/**
 * RightPanel component providing tabbed access to docs, snippets, comments, history, and settings.
 *
 * Features:
 * - Tabbed navigation with icons
 * - Documentation links and quick reference
 * - Code snippets for quick insertion
 * - Comments with resolve/unresolve functionality
 * - Version history with restore capability
 * - Settings for editor and preview configuration
 *
 * @example
 * ```tsx
 * <RightPanel
 *   diagramId="diagram-123"
 *   comments={commentsList}
 *   versions={versionList}
 *   settings={currentSettings}
 *   onInsertSnippet={(code) => insertIntoEditor(code)}
 *   onAddComment={(content) => addComment(content)}
 *   onSettingsChange={(changes) => updateSettings(changes)}
 * />
 * ```
 */
export const RightPanel = memo(function RightPanel({
  diagramId,
  comments = [],
  versions = [],
  settings,
  currentUserId,
  activeVersionId,
  currentSource,
  onInsertSnippet,
  onAddComment,
  onDeleteComment,
  onToggleCommentResolved,
  onSelectVersion,
  onRestoreVersion,
  onCreateSnapshot,
  onSettingsChange,
  isCommentsLoading = false,
  isHistoryLoading = false,
  defaultTab = 'docs',
  className = '',
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>(defaultTab);

  /**
   * Handle snippet insertion.
   */
  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      onInsertSnippet?.(snippet);
    },
    [onInsertSnippet]
  );

  /**
   * Handle adding a comment.
   */
  const handleAddComment = useCallback(
    (content: string) => {
      onAddComment?.(content);
    },
    [onAddComment]
  );

  /**
   * Handle deleting a comment.
   */
  const handleDeleteComment = useCallback(
    (commentId: string) => {
      onDeleteComment?.(commentId);
    },
    [onDeleteComment]
  );

  /**
   * Handle toggling comment resolved state.
   */
  const handleToggleResolved = useCallback(
    (commentId: string, resolved: boolean) => {
      onToggleCommentResolved?.(commentId, resolved);
    },
    [onToggleCommentResolved]
  );

  /**
   * Handle version selection.
   */
  const handleSelectVersion = useCallback(
    (versionId: string) => {
      onSelectVersion?.(versionId);
    },
    [onSelectVersion]
  );

  /**
   * Handle version restoration.
   */
  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      onRestoreVersion?.(versionId);
    },
    [onRestoreVersion]
  );

  /**
   * Handle creating a snapshot.
   */
  const handleCreateSnapshot = useCallback(
    (label?: string) => {
      onCreateSnapshot?.(label);
    },
    [onCreateSnapshot]
  );

  /**
   * Handle settings change.
   */
  const handleSettingsChange = useCallback(
    (changes: Partial<DiagramSettings>) => {
      onSettingsChange?.(changes);
    },
    [onSettingsChange]
  );

  /**
   * Get badge count for a tab.
   */
  const getBadgeCount = (tabId: RightPanelTab): number | undefined => {
    if (tabId === 'comments') {
      const unresolvedCount = comments.filter((c) => !c.resolved).length;
      return unresolvedCount > 0 ? unresolvedCount : undefined;
    }
    return undefined;
  };

  /**
   * Render the active tab content.
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'docs':
        return <DocsTab diagramId={diagramId} />;
      case 'snippets':
        return <SnippetsTab onInsert={handleInsertSnippet} />;
      case 'comments':
        return (
          <CommentsTab
            diagramId={diagramId}
            comments={comments}
            currentUserId={currentUserId}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onToggleResolved={handleToggleResolved}
            isLoading={isCommentsLoading}
          />
        );
      case 'history':
        return (
          <HistoryTab
            diagramId={diagramId}
            versions={versions}
            activeVersionId={activeVersionId}
            currentSource={currentSource}
            onSelectVersion={handleSelectVersion}
            onRestoreVersion={handleRestoreVersion}
            onCreateSnapshot={handleCreateSnapshot}
            isLoading={isHistoryLoading}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        right-panel
        h-full
        flex flex-col
        bg-background
        ${className}
      `}
    >
      {/* Tab navigation */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            badge={getBadgeCount(tab.id)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
});

export default RightPanel;
