'use client';

import {
  useState,
  useCallback,
  memo,
  type ReactNode,
  type KeyboardEvent,
} from 'react';

/**
 * Represents a node in the file tree.
 */
export interface FileTreeNode {
  /** Unique identifier for the node */
  id: string;
  /** Display name of the node */
  name: string;
  /** Node type - folder or file (diagram) */
  type: 'folder' | 'diagram';
  /** Child nodes (for folders) */
  children?: FileTreeNode[];
  /** Optional icon to override default */
  icon?: ReactNode;
  /** Optional metadata */
  metadata?: {
    /** Last modified date */
    updatedAt?: string;
    /** Number of entities in diagram */
    entityCount?: number;
    /** Whether the diagram has unsaved changes */
    isDirty?: boolean;
  };
}

/**
 * Props for a single tree item.
 */
interface TreeItemProps {
  /** The tree node to render */
  node: FileTreeNode;
  /** Current depth level (for indentation) */
  depth: number;
  /** ID of the currently selected node */
  selectedId?: string;
  /** Set of expanded folder IDs */
  expandedIds: Set<string>;
  /** Callback when a node is clicked */
  onNodeClick?: (node: FileTreeNode) => void;
  /** Callback when a node is double-clicked */
  onNodeDoubleClick?: (node: FileTreeNode) => void;
  /** Callback when a folder is toggled */
  onToggleExpand: (id: string) => void;
  /** Callback when a node context menu is requested */
  onContextMenu?: (node: FileTreeNode, event: React.MouseEvent) => void;
}

/**
 * TreeItem component for rendering a single node in the tree.
 */
const TreeItem = memo(function TreeItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onNodeClick,
  onNodeDoubleClick,
  onToggleExpand,
  onContextMenu,
}: TreeItemProps) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = isFolder && node.children && node.children.length > 0;

  /**
   * Handle click on the node.
   */
  const handleClick = useCallback(() => {
    if (isFolder) {
      onToggleExpand(node.id);
    }
    onNodeClick?.(node);
  }, [node, isFolder, onToggleExpand, onNodeClick]);

  /**
   * Handle double-click on the node.
   */
  const handleDoubleClick = useCallback(() => {
    onNodeDoubleClick?.(node);
  }, [node, onNodeDoubleClick]);

  /**
   * Handle context menu.
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(node, e);
    },
    [node, onContextMenu]
  );

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      } else if (e.key === 'ArrowRight' && isFolder && !isExpanded) {
        e.preventDefault();
        onToggleExpand(node.id);
      } else if (e.key === 'ArrowLeft' && isFolder && isExpanded) {
        e.preventDefault();
        onToggleExpand(node.id);
      }
    },
    [handleClick, isFolder, isExpanded, node.id, onToggleExpand]
  );

  return (
    <div className="tree-item">
      {/* Node row */}
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={isFolder ? isExpanded : undefined}
        aria-selected={isSelected}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-1.5
          py-1 px-2
          text-sm
          cursor-pointer
          rounded
          transition-colors
          ${isSelected
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Expand/collapse chevron for folders */}
        {isFolder && (
          <span
            className={`
              flex-shrink-0
              w-4 h-4
              flex items-center justify-center
              transition-transform duration-150
              ${isExpanded ? 'rotate-90' : ''}
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        {/* Node icon */}
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {node.icon || (
            isFolder ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 ${isExpanded ? 'text-yellow-500' : 'text-yellow-600'}`}
              >
                <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75z" />
                <path d="M3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-blue-500"
              >
                <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
              </svg>
            )
          )}
        </span>

        {/* Node name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Metadata indicators */}
        {node.metadata?.isDirty && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
        )}
        {node.metadata?.entityCount !== undefined && (
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {node.metadata.entityCount}
          </span>
        )}
      </div>

      {/* Children (for expanded folders) */}
      {isFolder && isExpanded && hasChildren && (
        <div role="group" className="tree-item__children">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onToggleExpand={onToggleExpand}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Props for the FileTree component.
 */
export interface FileTreeProps {
  /** Root nodes of the tree */
  nodes: FileTreeNode[];
  /** ID of the currently selected node */
  selectedId?: string;
  /** Initially expanded folder IDs */
  defaultExpandedIds?: string[];
  /** Callback when a node is selected */
  onSelect?: (node: FileTreeNode) => void;
  /** Callback when a diagram is opened (double-click) */
  onOpen?: (node: FileTreeNode) => void;
  /** Callback when context menu is requested */
  onContextMenu?: (node: FileTreeNode, event: React.MouseEvent) => void;
  /** Additional CSS class */
  className?: string;
  /** Whether the tree is loading */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * FileTree component for displaying a hierarchical file/folder structure.
 *
 * Features:
 * - Expandable/collapsible folders
 * - Single selection
 * - Keyboard navigation
 * - Context menu support
 * - Visual indicators for dirty/modified items
 *
 * @example
 * ```tsx
 * <FileTree
 *   nodes={[
 *     {
 *       id: 'folder-1',
 *       name: 'My Diagrams',
 *       type: 'folder',
 *       children: [
 *         { id: 'diagram-1', name: 'Customer Flow', type: 'diagram' },
 *       ],
 *     },
 *   ]}
 *   onSelect={(node) => setSelected(node)}
 *   onOpen={(node) => openDiagram(node.id)}
 * />
 * ```
 */
export const FileTree = memo(function FileTree({
  nodes,
  selectedId,
  defaultExpandedIds = [],
  onSelect,
  onOpen,
  onContextMenu,
  className = '',
  isLoading = false,
  emptyMessage = 'No diagrams',
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds)
  );

  /**
   * Toggle expansion state of a folder.
   */
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Handle node click (selection).
   */
  const handleNodeClick = useCallback(
    (node: FileTreeNode) => {
      onSelect?.(node);
    },
    [onSelect]
  );

  /**
   * Handle node double-click (open).
   */
  const handleNodeDoubleClick = useCallback(
    (node: FileTreeNode) => {
      if (node.type === 'diagram') {
        onOpen?.(node);
      }
    },
    [onOpen]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`file-tree ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className={`file-tree ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-8 h-8 mb-2 opacity-50"
          >
            <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75z" />
            <path d="M3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
          </svg>
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="File tree"
      className={`file-tree ${className}`}
    >
      {nodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onToggleExpand={handleToggleExpand}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
});

export default FileTree;
