'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MonacoEditor } from '@/components/Editor';
import { MermaidPreview } from '@/components/Preview';
import { Breadcrumb, BackButton } from '@/components/Navigation';
import { AppLayout, PanelToggleButton } from '@/components/Layout';
import { LeftPanel, type FileTreeNode, type RecentDiagram } from '@/components/Panels';
import { DiagramProvider, type DiagramEntry } from '@/contexts/DiagramContext';
import { useDiagramNavigation } from '@/hooks/useDiagramNavigation';
import type { BlockDirective } from '@/lib/mermaid/types';
import type { ProcessedSvg } from '@/lib/mermaid/svgProcessor';

/**
 * Default Mermaid source for the root diagram.
 */
const DEFAULT_MERMAID_SOURCE = `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
        string address
    }
    ORDER {
        int orderNumber
        date orderDate
        string status
    }
    LINE-ITEM {
        int quantity
        decimal price
        string productName
    }
    %%block: CUSTOMER -> diagramId=customer-details label="Customer Details"
`;

/**
 * Default root diagram entry.
 */
const DEFAULT_ROOT_DIAGRAM: DiagramEntry = {
  id: 'root',
  title: 'Main Diagram',
  source: DEFAULT_MERMAID_SOURCE,
};

/**
 * Mock function to fetch child diagrams.
 * In a real application, this would call the backend API.
 */
async function fetchChildDiagram(diagramId: string): Promise<DiagramEntry | null> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock child diagram data - in production this would come from the API
  const mockDiagrams: Record<string, DiagramEntry> = {
    'customer-details': {
      id: 'customer-details',
      title: 'Customer Details',
      source: `erDiagram
    CUSTOMER_PROFILE ||--|| CUSTOMER_ADDRESS : has
    CUSTOMER_PROFILE ||--o{ CUSTOMER_PHONE : has
    CUSTOMER_PROFILE ||--o{ CUSTOMER_PREFERENCES : has
    CUSTOMER_PROFILE {
        int profileId PK
        string firstName
        string lastName
        date dateOfBirth
        string avatarUrl
    }
    CUSTOMER_ADDRESS {
        int addressId PK
        string street
        string city
        string state
        string zipCode
        string country
    }
    CUSTOMER_PHONE {
        int phoneId PK
        string number
        string type
        boolean isPrimary
    }
    CUSTOMER_PREFERENCES {
        int prefId PK
        string category
        string value
    }
    %%block: CUSTOMER_PROFILE -> diagramId=profile-details label="Profile Details"
    %%block: CUSTOMER_ADDRESS -> diagramId=address-details label="Address Details"
`,
    },
    'profile-details': {
      id: 'profile-details',
      title: 'Profile Details',
      source: `erDiagram
    PROFILE_SECURITY ||--|| PROFILE_SETTINGS : has
    PROFILE_SECURITY ||--o{ LOGIN_HISTORY : tracks
    PROFILE_SECURITY {
        int securityId PK
        string passwordHash
        datetime lastLogin
        boolean twoFactorEnabled
    }
    PROFILE_SETTINGS {
        int settingsId PK
        boolean emailNotifications
        boolean smsNotifications
        string language
        string timezone
    }
    LOGIN_HISTORY {
        int historyId PK
        datetime loginTime
        string ipAddress
        string device
    }
`,
    },
    'address-details': {
      id: 'address-details',
      title: 'Address Details',
      source: `erDiagram
    ADDRESS_VALIDATION ||--|| ADDRESS_GEOCODE : has
    ADDRESS_VALIDATION {
        int validationId PK
        boolean isVerified
        datetime verifiedAt
        string verificationMethod
    }
    ADDRESS_GEOCODE {
        int geocodeId PK
        float latitude
        float longitude
        string formattedAddress
    }
`,
    },
  };

  return mockDiagrams[diagramId] || null;
}

/**
 * Header component for the application.
 */
function AppHeader({
  currentDiagram,
  renderError,
  depth,
  canGoBack,
  goBack,
  breadcrumbs,
  onBreadcrumbClick,
  showLeftPanel,
  showRightPanel,
  onToggleLeftPanel,
  onToggleRightPanel,
}: {
  currentDiagram: DiagramEntry | null;
  renderError: string | null;
  depth: number;
  canGoBack: boolean;
  goBack: () => void;
  breadcrumbs: Array<{ id: string; label: string; isCurrent: boolean }>;
  onBreadcrumbClick: (index: number) => void;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Left panel toggle */}
          <PanelToggleButton
            panel="left"
            isVisible={showLeftPanel}
            onToggle={onToggleLeftPanel}
          />

          <h1 className="text-xl font-bold">ER Viewer</h1>

          {/* Back button - only show when can go back */}
          {canGoBack && <BackButton onClick={goBack} size="sm" />}
        </div>

        <div className="flex items-center gap-4">
          {/* Render error indicator */}
          {renderError && (
            <span className="text-xs text-red-500">Syntax error</span>
          )}

          {/* Depth indicator */}
          {depth > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Depth: {depth}
            </span>
          )}

          <p className="text-sm text-muted-foreground hidden sm:block">
            Mermaid diagramming with nested ER blocks
          </p>

          {/* Right panel toggle */}
          <PanelToggleButton
            panel="right"
            isVisible={showRightPanel}
            onToggle={onToggleRightPanel}
          />
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 1 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <Breadcrumb
            items={breadcrumbs}
            onItemClick={onBreadcrumbClick}
            showHomeIcon
            size="sm"
            maxItems={5}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Mock file tree data.
 * In production, this would come from the backend API.
 */
const MOCK_FILE_TREE_NODES: FileTreeNode[] = [
  {
    id: 'folder-my-diagrams',
    name: 'My Diagrams',
    type: 'folder',
    children: [
      {
        id: 'root',
        name: 'Main Diagram',
        type: 'diagram',
        metadata: { entityCount: 3 },
      },
      {
        id: 'customer-details',
        name: 'Customer Details',
        type: 'diagram',
        metadata: { entityCount: 4 },
      },
    ],
  },
  {
    id: 'folder-shared',
    name: 'Shared',
    type: 'folder',
    children: [
      {
        id: 'order-system',
        name: 'Order System',
        type: 'diagram',
        metadata: { entityCount: 5 },
      },
    ],
  },
  {
    id: 'folder-templates',
    name: 'Templates',
    type: 'folder',
    children: [
      {
        id: 'template-basic-er',
        name: 'Basic ER Template',
        type: 'diagram',
        metadata: { entityCount: 2 },
      },
    ],
  },
];

/**
 * Generate mock recent diagrams data.
 * In production, this would come from localStorage or the backend.
 */
function generateMockRecentDiagrams(): RecentDiagram[] {
  const now = new Date();
  return [
    {
      id: 'root',
      title: 'Main Diagram',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      entityCount: 3,
      isDirty: false,
    },
    {
      id: 'customer-details',
      title: 'Customer Details',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      entityCount: 4,
      isDirty: false,
    },
    {
      id: 'order-system',
      title: 'Order System',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      entityCount: 5,
      isDirty: false,
    },
    {
      id: 'profile-details',
      title: 'Profile Details',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      entityCount: 3,
      isDirty: false,
    },
  ];
}

/**
 * Right panel placeholder component.
 * Will be replaced with RightPanel in subtask-8-3.
 */
function RightPanelPlaceholder() {
  const [activeTab, setActiveTab] = useState<'docs' | 'snippets' | 'history'>('docs');

  return (
    <div className="h-full flex flex-col">
      {/* Tab headers */}
      <div className="flex border-b border-border">
        {(['docs', 'snippets', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium
              border-b-2 transition-colors
              ${activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'docs' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Quick Reference</h3>
            <div className="space-y-2 text-muted-foreground">
              <p><code className="bg-muted px-1 rounded">erDiagram</code> - Start ER diagram</p>
              <p><code className="bg-muted px-1 rounded">||--o{'{}'}</code> - One to many</p>
              <p><code className="bg-muted px-1 rounded">||--||</code> - One to one</p>
              <p><code className="bg-muted px-1 rounded">%%block:</code> - Add nested block</p>
            </div>
          </div>
        )}
        {activeTab === 'snippets' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Code Snippets</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded bg-muted hover:bg-muted/80 text-sm">
                Basic ER Diagram
              </button>
              <button className="w-full text-left px-3 py-2 rounded bg-muted hover:bg-muted/80 text-sm">
                Entity with Attributes
              </button>
              <button className="w-full text-left px-3 py-2 rounded bg-muted hover:bg-muted/80 text-sm">
                Block Directive
              </button>
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Version History</h3>
            <div className="space-y-2 text-muted-foreground">
              <p className="italic">No versions saved yet</p>
              <button className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">
                Save Snapshot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Footer component for navigation help.
 */
function AppFooter({ depth }: { depth: number }) {
  if (depth === 0) return null;

  return (
    <div className="px-4 py-2 text-xs text-muted-foreground">
      <span>
        Click on block badges to navigate into sub-diagrams. Use the breadcrumb or back button to
        return to parent diagrams.
      </span>
    </div>
  );
}

/**
 * Center panel containing the editor and preview.
 */
function CenterPanel({
  currentDiagram,
  currentSource,
  processedSvg,
  onEditorChange,
  onRenderSuccess,
  onRenderError,
  onBlockClick,
  onSvgProcessed,
}: {
  currentDiagram: DiagramEntry | null;
  currentSource: string;
  processedSvg: ProcessedSvg | null;
  onEditorChange: (value: string | undefined) => void;
  onRenderSuccess: () => void;
  onRenderError: (error: Error) => void;
  onBlockClick: (block: BlockDirective, event: MouseEvent) => void;
  onSvgProcessed: (processed: ProcessedSvg) => void;
}) {
  const previewContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Editor panel */}
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border min-w-0">
        <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium">Editor</span>
          {currentDiagram && (
            <span className="text-xs text-muted-foreground truncate ml-2">
              {currentDiagram.title}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <MonacoEditor value={currentSource} onChange={onEditorChange} theme="vs-dark" />
        </div>
      </div>

      {/* Preview panel with Mermaid rendering */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium">Preview</span>
          {processedSvg && processedSvg.entityNodes.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {processedSvg.entityNodes.size} entities
              {processedSvg.blocks.length > 0 && <> ({processedSvg.blocks.length} with blocks)</>}
            </span>
          )}
        </div>
        <div className="flex-1 relative min-h-0" ref={previewContainerRef}>
          <MermaidPreview
            source={currentSource}
            isDarkMode={true}
            onRenderSuccess={onRenderSuccess}
            onRenderError={onRenderError}
            onBlockClick={onBlockClick}
            onSvgProcessed={onSvgProcessed}
            showBlockIndicators
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Main content component that uses the diagram navigation context.
 */
function DiagramViewer() {
  const [renderError, setRenderError] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<ProcessedSvg | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [recentDiagrams, setRecentDiagrams] = useState<RecentDiagram[]>(generateMockRecentDiagrams);
  const [searchQuery, setSearchQuery] = useState('');

  // Use the navigation hook
  const {
    currentDiagram,
    currentSource,
    isNavigating,
    handleBlockClick,
    goBack,
    goToIndex,
    setSource,
    setDiagram,
    canGoBack,
    depth,
    breadcrumbs,
  } = useDiagramNavigation({
    onFetchDiagram: fetchChildDiagram,
    onNavigationStart: () => {
      setRenderError(null);
    },
    onNavigationError: (error) => {
      setRenderError(`Failed to load diagram: ${error.message}`);
    },
  });

  // Initialize with default diagram if no current diagram
  useEffect(() => {
    if (!currentDiagram) {
      setDiagram(DEFAULT_ROOT_DIAGRAM);
    }
  }, [currentDiagram, setDiagram]);

  /**
   * Handle successful render.
   */
  const handleRenderSuccess = useCallback(() => {
    setRenderError(null);
  }, []);

  /**
   * Handle render error.
   */
  const handleRenderError = useCallback((error: Error) => {
    setRenderError(error.message);
  }, []);

  /**
   * Handle block click from the preview.
   */
  const handlePreviewBlockClick = useCallback(
    (block: BlockDirective, event: MouseEvent) => {
      handleBlockClick(block, event);
    },
    [handleBlockClick]
  );

  /**
   * Handle editor source changes.
   */
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setSource(value ?? '');
    },
    [setSource]
  );

  /**
   * Handle breadcrumb navigation.
   */
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      goToIndex(index);
    },
    [goToIndex]
  );

  /**
   * Handle processed SVG update.
   */
  const handleSvgProcessed = useCallback((processed: ProcessedSvg) => {
    setProcessedSvg(processed);
  }, []);

  /**
   * Toggle panel visibility.
   */
  const toggleLeftPanel = useCallback(() => {
    setShowLeftPanel((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setShowRightPanel((prev) => !prev);
  }, []);

  /**
   * Handle search from left panel.
   */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Handle diagram open from left panel.
   */
  const handleDiagramOpen = useCallback(
    async (id: string, name: string) => {
      // For "new" diagram, create a new one
      if (id === 'new') {
        const newDiagram: DiagramEntry = {
          id: `diagram-${Date.now()}`,
          title: 'New Diagram',
          source: `erDiagram
    ENTITY1 {
        int id PK
        string name
    }
`,
        };
        setDiagram(newDiagram);

        // Add to recent diagrams
        setRecentDiagrams((prev) => [
          {
            id: newDiagram.id,
            title: newDiagram.title,
            timestamp: new Date().toISOString(),
            entityCount: 1,
            isDirty: true,
          },
          ...prev.filter((d) => d.id !== newDiagram.id).slice(0, 9),
        ]);
        return;
      }

      // Check if it's the root diagram
      if (id === 'root') {
        setDiagram(DEFAULT_ROOT_DIAGRAM);
      } else {
        // Try to fetch from the mock API
        const childDiagram = await fetchChildDiagram(id);
        if (childDiagram) {
          setDiagram(childDiagram);
        }
      }

      // Update recent diagrams
      setRecentDiagrams((prev) => {
        const existing = prev.find((d) => d.id === id);
        if (existing) {
          // Move to top
          return [
            { ...existing, timestamp: new Date().toISOString() },
            ...prev.filter((d) => d.id !== id),
          ];
        }
        // Add new entry
        return [
          {
            id,
            title: name,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 9),
        ];
      });
    },
    [setDiagram]
  );

  /**
   * Handle removing a diagram from recent list.
   */
  const handleRemoveRecent = useCallback((id: string) => {
    setRecentDiagrams((prev) => prev.filter((d) => d.id !== id));
  }, []);

  /**
   * Handle clearing all recent diagrams.
   */
  const handleClearRecent = useCallback(() => {
    setRecentDiagrams([]);
  }, []);

  /**
   * Memoize file tree nodes to avoid unnecessary re-renders.
   */
  const fileTreeNodes = useMemo(() => MOCK_FILE_TREE_NODES, []);

  // Loading state during navigation
  if (isNavigating) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      header={
        <AppHeader
          currentDiagram={currentDiagram}
          renderError={renderError}
          depth={depth}
          canGoBack={canGoBack}
          goBack={goBack}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          onToggleLeftPanel={toggleLeftPanel}
          onToggleRightPanel={toggleRightPanel}
        />
      }
      leftPanel={
        <LeftPanel
          fileTreeNodes={fileTreeNodes}
          recentDiagrams={recentDiagrams}
          activeId={currentDiagram?.id}
          selectedId={currentDiagram?.id}
          onSearch={handleSearch}
          onOpen={handleDiagramOpen}
          onRemoveRecent={handleRemoveRecent}
          onClearRecent={handleClearRecent}
          defaultExpandedIds={['folder-my-diagrams']}
        />
      }
      centerPanel={
        <CenterPanel
          currentDiagram={currentDiagram}
          currentSource={currentSource}
          processedSvg={processedSvg}
          onEditorChange={handleEditorChange}
          onRenderSuccess={handleRenderSuccess}
          onRenderError={handleRenderError}
          onBlockClick={handlePreviewBlockClick}
          onSvgProcessed={handleSvgProcessed}
        />
      }
      rightPanel={<RightPanelPlaceholder />}
      footer={<AppFooter depth={depth} />}
      showLeftPanel={showLeftPanel}
      showRightPanel={showRightPanel}
      onLeftPanelToggle={setShowLeftPanel}
      onRightPanelToggle={setShowRightPanel}
    />
  );
}

/**
 * Home page component wrapped with DiagramProvider.
 */
export default function Home() {
  return (
    <DiagramProvider>
      <DiagramViewer />
    </DiagramProvider>
  );
}
