/**
 * Panel components for the application sidebar.
 *
 * These components are used in the left and right panels of the 3-panel layout.
 */

// Left panel components
export { LeftPanel, type LeftPanelProps } from './LeftPanel';
export { FileTree, type FileTreeProps, type FileTreeNode } from './FileTree';
export { SearchInput, type SearchInputProps } from './SearchInput';
export { RecentDiagrams, type RecentDiagramsProps, type RecentDiagram } from './RecentDiagrams';

// Right panel components
export { RightPanel, type RightPanelProps, type RightPanelTab } from './RightPanel';

// Tab components
export {
  DocsTab,
  SnippetsTab,
  CommentsTab,
  HistoryTab,
  SettingsTab,
  type DocsTabProps,
  type SnippetsTabProps,
  type CommentsTabProps,
  type HistoryTabProps,
  type SettingsTabProps,
  type Comment,
  type DiagramVersion,
  type DiagramSettings,
} from './Tabs';
