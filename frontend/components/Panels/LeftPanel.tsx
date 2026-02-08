'use client';

import {
  useState,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { SearchInput } from './SearchInput';
import { FileTree, type FileTreeNode } from './FileTree';
import { RecentDiagrams, type RecentDiagram } from './RecentDiagrams';

/**
 * Tab options for the left panel.
 */
type LeftPanelTab = 'files' | 'recent';

/**
 * Props for the LeftPanel component.
 */
export interface LeftPanelProps {
  /** File tree nodes */
  fileTreeNodes?: FileTreeNode[];
  /** Recent diagrams list */
  recentDiagrams?: RecentDiagram[];
  /** ID of the currently selected file/diagram */
  selectedId?: string;
  /** ID of the currently active diagram */
  activeId?: string;
  /** Callback when a file/diagram is selected */
  onSelect?: (id: string, name: string) => void;
  /** Callback when a diagram is opened */
  onOpen?: (id: string, name: string) => void;
  /** Callback when search query changes */
  onSearch?: (query: string) => void;
  /** Callback when a recent diagram is removed */
  onRemoveRecent?: (id: string) => void;
  /** Callback to clear all recent diagrams */
  onClearRecent?: () => void;
  /** Callback for context menu on file tree node */
  onContextMenu?: (node: FileTreeNode, event: React.MouseEvent) => void;
  /** Whether file tree is loading */
  isFileTreeLoading?: boolean;
  /** Whether recent diagrams are loading */
  isRecentLoading?: boolean;
  /** Default expanded folder IDs for file tree */
  defaultExpandedIds?: string[];
  /** Additional CSS class */
  className?: string;
  /** Default active tab */
  defaultTab?: LeftPanelTab;
}

/**
 * Section header component for the left panel.
 */
const SectionHeader = memo(function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {action}
    </div>
  );
});

/**
 * Tab button component.
 */
const TabButton = memo(function TabButton({
  label,
  isActive,
  onClick,
  count,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1
        px-3 py-2
        text-sm font-medium
        border-b-2
        transition-colors
        ${isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
        }
      `}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
      )}
    </button>
  );
});

/**
 * Create new diagram button component.
 */
const CreateButton = memo(function CreateButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full
        flex items-center gap-2
        px-3 py-2
        text-sm
        text-muted-foreground
        hover:text-foreground
        hover:bg-muted
        rounded
        transition-colors
        border border-dashed border-border
        hover:border-primary/50
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
      <span>New Diagram</span>
    </button>
  );
});

/**
 * LeftPanel component for the application sidebar.
 *
 * Contains:
 * - Search input for filtering diagrams
 * - File tree for browsing diagrams by folder
 * - Recent diagrams list for quick access
 *
 * Features:
 * - Tab-based navigation between file tree and recent diagrams
 * - Search with debounced filtering
 * - Keyboard accessible
 * - Context menu support
 *
 * @example
 * ```tsx
 * <LeftPanel
 *   fileTreeNodes={fileNodes}
 *   recentDiagrams={recentList}
 *   selectedId={currentDiagramId}
 *   onSelect={(id, name) => selectDiagram(id)}
 *   onOpen={(id, name) => openDiagram(id)}
 *   onSearch={(query) => filterDiagrams(query)}
 * />
 * ```
 */
export const LeftPanel = memo(function LeftPanel({
  fileTreeNodes = [],
  recentDiagrams = [],
  selectedId,
  activeId,
  onSelect,
  onOpen,
  onSearch,
  onRemoveRecent,
  onClearRecent,
  onContextMenu,
  isFileTreeLoading = false,
  isRecentLoading = false,
  defaultExpandedIds = [],
  className = '',
  defaultTab = 'recent',
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Handle search input change.
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  /**
   * Handle file tree node selection.
   */
  const handleFileTreeSelect = useCallback(
    (node: FileTreeNode) => {
      onSelect?.(node.id, node.name);
    },
    [onSelect]
  );

  /**
   * Handle file tree node open (double-click).
   */
  const handleFileTreeOpen = useCallback(
    (node: FileTreeNode) => {
      if (node.type === 'diagram') {
        onOpen?.(node.id, node.name);
      }
    },
    [onOpen]
  );

  /**
   * Handle recent diagram selection.
   */
  const handleRecentSelect = useCallback(
    (diagram: RecentDiagram) => {
      onOpen?.(diagram.id, diagram.title);
    },
    [onOpen]
  );

  /**
   * Handle recent diagram removal.
   */
  const handleRecentRemove = useCallback(
    (diagram: RecentDiagram) => {
      onRemoveRecent?.(diagram.id);
    },
    [onRemoveRecent]
  );

  /**
   * Filter file tree nodes based on search query.
   */
  const filteredFileTreeNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return fileTreeNodes;
    }

    const query = searchQuery.toLowerCase();

    const filterNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.reduce<FileTreeNode[]>((acc, node) => {
        const nameMatches = node.name.toLowerCase().includes(query);

        if (node.type === 'folder' && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0 || nameMatches) {
            acc.push({
              ...node,
              children: filteredChildren,
            });
          }
        } else if (nameMatches) {
          acc.push(node);
        }

        return acc;
      }, []);
    };

    return filterNodes(fileTreeNodes);
  }, [fileTreeNodes, searchQuery]);

  /**
   * Filter recent diagrams based on search query.
   */
  const filteredRecentDiagrams = useMemo(() => {
    if (!searchQuery.trim()) {
      return recentDiagrams;
    }

    const query = searchQuery.toLowerCase();
    return recentDiagrams.filter((diagram) =>
      diagram.title.toLowerCase().includes(query)
    );
  }, [recentDiagrams, searchQuery]);

  return (
    <div
      className={`
        left-panel
        h-full
        flex flex-col
        bg-background
        ${className}
      `}
    >
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <SearchInput
          value={searchQuery}
          placeholder="Search diagrams..."
          onChange={handleSearchChange}
          debounceMs={200}
          size="sm"
        />
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border">
        <TabButton
          label="Recent"
          isActive={activeTab === 'recent'}
          onClick={() => setActiveTab('recent')}
          count={recentDiagrams.length}
        />
        <TabButton
          label="Files"
          isActive={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'recent' && (
          <div className="p-3">
            <RecentDiagrams
              diagrams={filteredRecentDiagrams}
              activeId={activeId}
              onSelect={handleRecentSelect}
              onRemove={onRemoveRecent ? handleRecentRemove : undefined}
              onClearAll={onClearRecent}
              isLoading={isRecentLoading}
              showClearAll={!searchQuery}
              emptyMessage={
                searchQuery
                  ? 'No matching diagrams'
                  : 'No recent diagrams'
              }
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-2">
            <FileTree
              nodes={filteredFileTreeNodes}
              selectedId={selectedId}
              defaultExpandedIds={defaultExpandedIds}
              onSelect={handleFileTreeSelect}
              onOpen={handleFileTreeOpen}
              onContextMenu={onContextMenu}
              isLoading={isFileTreeLoading}
              emptyMessage={
                searchQuery
                  ? 'No matching files'
                  : 'No diagrams yet'
              }
            />
          </div>
        )}
      </div>

      {/* Footer with create button */}
      <div className="p-3 border-t border-border">
        <CreateButton onClick={() => onOpen?.('new', 'New Diagram')} />
      </div>
    </div>
  );
});

export default LeftPanel;
