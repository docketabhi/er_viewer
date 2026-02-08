'use client';

import {
  useState,
  useCallback,
  useEffect,
  memo,
  type ReactNode,
} from 'react';
import { ResizablePanel, PANEL_SIZES } from './ResizablePanel';

/**
 * Props for the AppLayout component.
 */
export interface AppLayoutProps {
  /** Content for the left panel (file tree, search, etc.) */
  leftPanel?: ReactNode;
  /** Content for the center panel (editor + preview) */
  centerPanel: ReactNode;
  /** Content for the right panel (docs, snippets, etc.) */
  rightPanel?: ReactNode;
  /** Header content (logo, navigation, etc.) */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Whether the left panel is visible */
  showLeftPanel?: boolean;
  /** Whether the right panel is visible */
  showRightPanel?: boolean;
  /** Initial width of the left panel */
  leftPanelWidth?: number;
  /** Initial width of the right panel */
  rightPanelWidth?: number;
  /** Minimum width of the left panel */
  leftPanelMinWidth?: number;
  /** Minimum width of the right panel */
  rightPanelMinWidth?: number;
  /** Maximum width of the left panel */
  leftPanelMaxWidth?: number;
  /** Maximum width of the right panel */
  rightPanelMaxWidth?: number;
  /** Header for left panel */
  leftPanelHeader?: ReactNode;
  /** Header for right panel */
  rightPanelHeader?: ReactNode;
  /** Callback when left panel visibility changes */
  onLeftPanelToggle?: (visible: boolean) => void;
  /** Callback when right panel visibility changes */
  onRightPanelToggle?: (visible: boolean) => void;
  /** Additional CSS class for the layout container */
  className?: string;
}

/**
 * Breakpoints for responsive behavior.
 */
const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
};

/**
 * Hook to detect screen size and responsive breakpoints.
 */
function useResponsive() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.tablet) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
  };
}

/**
 * AppLayout component providing a responsive 3-panel layout.
 *
 * The layout consists of:
 * - Left panel: Collapsible sidebar for file tree, search, recent items
 * - Center panel: Main content area for editor and preview
 * - Right panel: Collapsible sidebar for docs, snippets, comments, history
 *
 * Features:
 * - Resizable panels with drag handles
 * - Collapsible side panels
 * - Responsive behavior (panels auto-collapse on smaller screens)
 * - Keyboard accessible resize controls
 * - Size persistence via localStorage
 *
 * @example
 * ```tsx
 * <AppLayout
 *   header={<TopBar />}
 *   leftPanel={<LeftPanel />}
 *   centerPanel={<EditorPreview />}
 *   rightPanel={<RightPanel />}
 *   showLeftPanel
 *   showRightPanel
 * />
 * ```
 */
export const AppLayout = memo(function AppLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  header,
  footer,
  showLeftPanel = true,
  showRightPanel = true,
  leftPanelWidth = PANEL_SIZES.SIDEBAR_LEFT,
  rightPanelWidth = PANEL_SIZES.SIDEBAR_RIGHT,
  leftPanelMinWidth = 180,
  rightPanelMinWidth = 200,
  leftPanelMaxWidth = 400,
  rightPanelMaxWidth = 500,
  leftPanelHeader,
  rightPanelHeader,
  onLeftPanelToggle,
  onRightPanelToggle,
  className = '',
}: AppLayoutProps) {
  const { isMobile, isTablet } = useResponsive();

  // Panel visibility state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Auto-collapse panels on smaller screens
  useEffect(() => {
    if (isMobile) {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    } else if (isTablet) {
      setRightCollapsed(true);
    }
  }, [isMobile, isTablet]);

  /**
   * Handle left panel collapse toggle.
   */
  const handleLeftCollapsedChange = useCallback(
    (collapsed: boolean) => {
      setLeftCollapsed(collapsed);
      onLeftPanelToggle?.(!collapsed);
    },
    [onLeftPanelToggle]
  );

  /**
   * Handle right panel collapse toggle.
   */
  const handleRightCollapsedChange = useCallback(
    (collapsed: boolean) => {
      setRightCollapsed(collapsed);
      onRightPanelToggle?.(!collapsed);
    },
    [onRightPanelToggle]
  );

  /**
   * Toggle left panel.
   */
  const toggleLeftPanel = useCallback(() => {
    handleLeftCollapsedChange(!leftCollapsed);
  }, [leftCollapsed, handleLeftCollapsedChange]);

  /**
   * Toggle right panel.
   */
  const toggleRightPanel = useCallback(() => {
    handleRightCollapsedChange(!rightCollapsed);
  }, [rightCollapsed, handleRightCollapsedChange]);

  return (
    <div
      className={`
        app-layout
        flex flex-col
        h-screen w-screen
        overflow-hidden
        bg-background
        ${className}
      `}
    >
      {/* Header */}
      {header && (
        <header className="app-layout__header flex-shrink-0 border-b border-border z-10">
          {header}
        </header>
      )}

      {/* Main content area with 3-panel layout */}
      <main className="app-layout__main flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {showLeftPanel && leftPanel && (
          <ResizablePanel
            defaultSize={leftPanelWidth}
            minSize={leftPanelMinWidth}
            maxSize={leftPanelMaxWidth}
            direction="horizontal"
            handlePosition="end"
            collapsible
            collapsed={leftCollapsed}
            onCollapsedChange={handleLeftCollapsedChange}
            persistKey="left-panel"
            header={leftPanelHeader}
            aria-label="Left sidebar"
            className="app-layout__left-panel border-r border-border bg-background"
          >
            {leftPanel}
          </ResizablePanel>
        )}

        {/* Mobile toggle for left panel */}
        {showLeftPanel && leftPanel && leftCollapsed && (
          <button
            type="button"
            onClick={toggleLeftPanel}
            className="
              app-layout__left-toggle
              md:hidden
              fixed bottom-4 left-4 z-50
              w-10 h-10
              bg-primary text-primary-foreground
              rounded-full shadow-lg
              flex items-center justify-center
              hover:bg-primary/90
              transition-colors
            "
            aria-label="Show left panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Center Panel - Always visible, takes remaining space */}
        <div className="app-layout__center-panel flex-1 flex flex-col overflow-hidden min-w-0">
          {centerPanel}
        </div>

        {/* Right Panel */}
        {showRightPanel && rightPanel && (
          <ResizablePanel
            defaultSize={rightPanelWidth}
            minSize={rightPanelMinWidth}
            maxSize={rightPanelMaxWidth}
            direction="horizontal"
            handlePosition="start"
            collapsible
            collapsed={rightCollapsed}
            onCollapsedChange={handleRightCollapsedChange}
            persistKey="right-panel"
            header={rightPanelHeader}
            aria-label="Right sidebar"
            className="app-layout__right-panel border-l border-border bg-background"
          >
            {rightPanel}
          </ResizablePanel>
        )}

        {/* Mobile toggle for right panel */}
        {showRightPanel && rightPanel && rightCollapsed && (
          <button
            type="button"
            onClick={toggleRightPanel}
            className="
              app-layout__right-toggle
              md:hidden
              fixed bottom-4 right-4 z-50
              w-10 h-10
              bg-primary text-primary-foreground
              rounded-full shadow-lg
              flex items-center justify-center
              hover:bg-primary/90
              transition-colors
            "
            aria-label="Show right panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </main>

      {/* Footer */}
      {footer && (
        <footer className="app-layout__footer flex-shrink-0 border-t border-border">
          {footer}
        </footer>
      )}
    </div>
  );
});

/**
 * Panel toggle button for header/toolbar use.
 */
export interface PanelToggleButtonProps {
  /** Which panel to toggle */
  panel: 'left' | 'right';
  /** Whether the panel is currently visible */
  isVisible: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Additional CSS class */
  className?: string;
}

export const PanelToggleButton = memo(function PanelToggleButton({
  panel,
  isVisible,
  onToggle,
  className = '',
}: PanelToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        panel-toggle-button
        p-2 rounded-md
        text-muted-foreground hover:text-foreground
        hover:bg-muted
        transition-colors
        ${className}
      `}
      aria-label={`${isVisible ? 'Hide' : 'Show'} ${panel} panel`}
      aria-pressed={isVisible}
    >
      {panel === 'left' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm9.25 5.25a.75.75 0 01.75-.75h5.25a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
});

export default AppLayout;
