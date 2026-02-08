'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MonacoEditor } from '@/components/Editor';
import { MermaidPreview } from '@/components/Preview';
import { Breadcrumb, BackButton } from '@/components/Navigation';
import { AppLayout, PanelToggleButton } from '@/components/Layout';
import {
  LeftPanel,
  RightPanel,
  type FileTreeNode,
  type RecentDiagram,
  type DiagramVersion,
  type DiagramSettings,
} from '@/components/Panels';
import { EntityContextMenu } from '@/components/ContextMenu';
import { DiagramProvider, useDiagram, type DiagramEntry } from '@/contexts/DiagramContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDiagramNavigation, useContextMenu, useAutoSave } from '@/hooks';
import { diagramsApi, ApiError } from '@/lib/api';
import type { BlockDirective } from '@/lib/mermaid/types';
import type { ProcessedSvg, EntityNodeInfo } from '@/lib/mermaid/svgProcessor';
import type { MermaidTheme } from '@/lib/mermaid/config';
import { generateContextualSkeleton } from '@/lib/diagram';

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
 * Auto-save status indicator component.
 */
function AutoSaveIndicator({
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
  onManualSave,
}: {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: Error | null;
  onManualSave: () => void;
}) {
  // Format the last saved time
  const formattedTime = lastSavedAt
    ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  if (isSaving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (saveError) {
    return (
      <button
        onClick={onManualSave}
        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
        title={`Save failed: ${saveError.message}. Click to retry.`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Save failed</span>
      </button>
    );
  }

  if (isDirty) {
    return (
      <button
        onClick={onManualSave}
        className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 transition-colors"
        title="Unsaved changes. Click to save now."
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="4" />
        </svg>
        <span>Unsaved</span>
      </button>
    );
  }

  if (formattedTime) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={`Last saved at ${formattedTime}`}>
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Saved {formattedTime}</span>
      </div>
    );
  }

  return null;
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
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
  onManualSave,
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
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: Error | null;
  onManualSave: () => void;
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
          {/* Auto-save status indicator */}
          <AutoSaveIndicator
            isDirty={isDirty}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            onManualSave={onManualSave}
          />

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
  mermaidTheme,
  isDarkMode,
  onEditorChange,
  onRenderSuccess,
  onRenderError,
  onBlockClick,
  onEntityContextMenu,
  onSvgProcessed,
}: {
  currentDiagram: DiagramEntry | null;
  currentSource: string;
  processedSvg: ProcessedSvg | null;
  mermaidTheme: MermaidTheme;
  isDarkMode: boolean;
  onEditorChange: (value: string | undefined) => void;
  onRenderSuccess: () => void;
  onRenderError: (error: Error) => void;
  onBlockClick: (block: BlockDirective, event: MouseEvent) => void;
  onEntityContextMenu: (entityName: string, event: MouseEvent) => void;
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
          <MonacoEditor value={currentSource} onChange={onEditorChange} theme={isDarkMode ? 'vs-dark' : 'vs'} />
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
            theme={mermaidTheme}
            isDarkMode={isDarkMode}
            onRenderSuccess={onRenderSuccess}
            onRenderError={onRenderError}
            onBlockClick={onBlockClick}
            onEntityContextMenu={onEntityContextMenu}
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
  // Get app theme from context
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Get diagram context for save state
  const { state: diagramState, markSaved, loadFromLocalStorage } = useDiagram();

  const [renderError, setRenderError] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<ProcessedSvg | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [recentDiagrams, setRecentDiagrams] = useState<RecentDiagram[]>(generateMockRecentDiagrams);
  const [searchQuery, setSearchQuery] = useState('');
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [settings, setSettings] = useState<DiagramSettings>({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
    autoSaveInterval: 30,
    mermaidTheme: 'auto',
    previewDebounce: 300,
    showBlockIndicators: true,
  });

  // Context menu state for entity right-click
  interface ContextMenuTarget {
    entityName: string;
    entityInfo: EntityNodeInfo | null;
  }
  const {
    state: contextMenuState,
    openMenu: openContextMenu,
    closeMenu: closeContextMenu,
  } = useContextMenu<ContextMenuTarget>();

  // Selected entity state for command palette actions
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

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

  /**
   * Save diagram to backend API.
   * Falls back to localStorage-only if the diagram is new/mock or API fails.
   */
  const saveDiagram = useCallback(async (source: string) => {
    if (!currentDiagram) return;

    // Check if this is a real backend diagram (UUID format)
    const isRealDiagram = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentDiagram.id);

    if (isRealDiagram) {
      try {
        await diagramsApi.updateSource(currentDiagram.id, source);
        markSaved();
      } catch (err) {
        // If it's a 404, the diagram might not exist in the backend yet
        if (err instanceof ApiError && err.isNotFound()) {
          // Just save to localStorage, don't throw
          markSaved();
        } else {
          throw err;
        }
      }
    } else {
      // For mock/local diagrams, just mark as saved (localStorage handles it)
      markSaved();
    }
  }, [currentDiagram, markSaved]);

  // Set up auto-save
  const {
    isDirty: autoSaveIsDirty,
    isSaving: autoSaveIsSaving,
    saveError: autoSaveSaveError,
    lastSavedAt: autoSaveLastSavedAt,
    save: manualSave,
  } = useAutoSave({
    id: currentDiagram?.id ?? 'default',
    content: currentSource,
    onSave: saveDiagram,
    interval: settings.autoSaveInterval * 1000, // Convert seconds to ms
    debounceDelay: 1000,
    enabled: Boolean(currentDiagram),
    onSaveSuccess: () => {
      // Create auto-save version entry
      if (currentDiagram) {
        const autoSaveVersion: DiagramVersion = {
          id: `auto-${Date.now()}`,
          label: 'Auto-save',
          createdAt: new Date(),
          createdBy: 'Auto-save',
          isAutoSave: true,
        };
        setVersions((prev) => {
          // Keep only the latest 5 auto-saves
          const autoSaves = prev.filter((v) => v.isAutoSave);
          const manualSaves = prev.filter((v) => !v.isAutoSave);
          const newAutoSaves = [autoSaveVersion, ...autoSaves].slice(0, 5);
          return [...newAutoSaves, ...manualSaves];
        });
      }
    },
  });

  // Initialize with default diagram if no current diagram
  // Also try to load from localStorage on initial mount
  useEffect(() => {
    if (!currentDiagram) {
      // Try to load from localStorage first
      const savedDiagram = loadFromLocalStorage('root');
      if (savedDiagram) {
        setDiagram(savedDiagram);
      } else {
        setDiagram(DEFAULT_ROOT_DIAGRAM);
      }
    }
  }, [currentDiagram, setDiagram, loadFromLocalStorage]);

  /**
   * Handle command palette 'Create Subdiagram from Selection' action.
   * If an entity is selected/focused, creates a subdiagram for it.
   * Otherwise, prompts user to select an entity first.
   */
  const handleCommandPaletteCreateSubdiagram = useCallback(() => {
    // Check if we have a selected entity from context menu or other selection
    if (selectedEntity) {
      // Use the selected entity
      const newDiagramId = `${selectedEntity.toLowerCase()}-details-${Date.now()}`;
      const skeletonResult = generateContextualSkeleton(
        selectedEntity,
        currentSource,
        {
          relatedEntityCount: 3,
          includeComments: true,
          includeParentReference: true,
        }
      );

      const blockDirective = `%%block: ${selectedEntity} -> diagramId=${newDiagramId} label="${skeletonResult.suggestedTitle}"`;
      const newSource = currentSource + '\n' + blockDirective;
      setSource(newSource);

      // Dispatch event to notify about new diagram creation
      window.dispatchEvent(
        new CustomEvent('er-viewer:diagram-created', {
          detail: {
            diagram: {
              id: newDiagramId,
              title: skeletonResult.suggestedTitle,
              source: skeletonResult.source,
            },
            parentEntityName: selectedEntity,
            parentDiagramId: currentDiagram?.id,
          },
        })
      );

      // Clear selection
      setSelectedEntity(null);
      return;
    }

    // If no entity is selected, check if there are any entities without blocks
    if (processedSvg && processedSvg.entityNodes.size > 0) {
      // Find entities without blocks
      const entitiesWithoutBlocks: string[] = [];
      processedSvg.entityNodes.forEach((info, name) => {
        if (!info.hasBlock) {
          entitiesWithoutBlocks.push(name);
        }
      });

      if (entitiesWithoutBlocks.length > 0) {
        // Use the first available entity
        const entityName = entitiesWithoutBlocks[0];
        const newDiagramId = `${entityName.toLowerCase()}-details-${Date.now()}`;
        const skeletonResult = generateContextualSkeleton(
          entityName,
          currentSource,
          {
            relatedEntityCount: 3,
            includeComments: true,
            includeParentReference: true,
          }
        );

        const blockDirective = `%%block: ${entityName} -> diagramId=${newDiagramId} label="${skeletonResult.suggestedTitle}"`;
        const newSource = currentSource + '\n' + blockDirective;
        setSource(newSource);

        // Dispatch event
        window.dispatchEvent(
          new CustomEvent('er-viewer:diagram-created', {
            detail: {
              diagram: {
                id: newDiagramId,
                title: skeletonResult.suggestedTitle,
                source: skeletonResult.source,
              },
              parentEntityName: entityName,
              parentDiagramId: currentDiagram?.id,
            },
          })
        );
      }
    }
  }, [selectedEntity, currentSource, currentDiagram, processedSvg, setSource]);

  // Listen for command palette events
  useEffect(() => {
    const handleCreateSubdiagramEvent = () => {
      handleCommandPaletteCreateSubdiagram();
    };

    const handleNavigateBackEvent = () => {
      if (canGoBack) {
        goBack();
      }
    };

    window.addEventListener('er-viewer:create-subdiagram', handleCreateSubdiagramEvent);
    window.addEventListener('er-viewer:navigate-back', handleNavigateBackEvent);

    return () => {
      window.removeEventListener('er-viewer:create-subdiagram', handleCreateSubdiagramEvent);
      window.removeEventListener('er-viewer:navigate-back', handleNavigateBackEvent);
    };
  }, [handleCommandPaletteCreateSubdiagram, canGoBack, goBack]);

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
   * Handle entity right-click to open context menu.
   */
  const handleEntityContextMenu = useCallback(
    (entityName: string, event: MouseEvent) => {
      const entityInfo = processedSvg?.entityNodes.get(entityName) ?? null;
      // Set selected entity for command palette actions
      setSelectedEntity(entityName);
      openContextMenu(event, { entityName, entityInfo });
    },
    [openContextMenu, processedSvg]
  );

  /**
   * Handle entity click to select it for command palette actions.
   */
  const handleEntityClick = useCallback(
    (entityName: string) => {
      setSelectedEntity(entityName);
    },
    []
  );

  /**
   * Handle "Link to subdiagram" from context menu.
   * Opens a dialog/modal to select an existing diagram to link to.
   */
  const handleLinkToSubdiagram = useCallback(
    (entityName: string) => {
      // For now, we'll add a placeholder block directive to the source
      // In a real app, this would open a diagram picker dialog
      const blockDirective = `%%block: ${entityName} -> diagramId=new-${entityName.toLowerCase()}-diagram label="${entityName} Details"`;
      const newSource = currentSource + '\n' + blockDirective;
      setSource(newSource);
      closeContextMenu();
    },
    [currentSource, setSource, closeContextMenu]
  );

  /**
   * Handle "Create subdiagram" from context menu.
   * Creates a new child diagram with an auto-generated skeleton structure.
   */
  const handleCreateSubdiagram = useCallback(
    (entityName: string) => {
      // Generate a new diagram ID
      const newDiagramId = `${entityName.toLowerCase()}-details-${Date.now()}`;

      // Generate skeleton diagram for the child
      const skeletonResult = generateContextualSkeleton(
        entityName,
        currentSource,
        {
          relatedEntityCount: 3,
          includeComments: true,
          includeParentReference: true,
        }
      );

      // Add block directive to current source
      const blockDirective = `%%block: ${entityName} -> diagramId=${newDiagramId} label="${skeletonResult.suggestedTitle}"`;
      const newSource = currentSource + '\n' + blockDirective;
      setSource(newSource);

      // Store the generated skeleton in mock diagrams
      // In a real app, this would create the child diagram via API
      const newChildDiagram: DiagramEntry = {
        id: newDiagramId,
        title: skeletonResult.suggestedTitle,
        source: skeletonResult.source,
      };

      // Dispatch event to notify about new diagram creation
      window.dispatchEvent(
        new CustomEvent('er-viewer:diagram-created', {
          detail: {
            diagram: newChildDiagram,
            parentEntityName: entityName,
            parentDiagramId: currentDiagram?.id,
          },
        })
      );

      closeContextMenu();
    },
    [currentSource, currentDiagram, setSource, closeContextMenu]
  );

  /**
   * Handle "Go to subdiagram" from context menu.
   */
  const handleGoToSubdiagram = useCallback(
    (block: BlockDirective) => {
      closeContextMenu();
      handleBlockClick(block, new MouseEvent('click'));
    },
    [handleBlockClick, closeContextMenu]
  );

  /**
   * Handle "Edit block" from context menu.
   */
  const handleEditBlock = useCallback(
    (entityName: string, block: BlockDirective) => {
      // In a real app, this would open a dialog to edit the block
      // For now, we just log it
      closeContextMenu();
    },
    [closeContextMenu]
  );

  /**
   * Handle "Remove block" from context menu.
   */
  const handleRemoveBlock = useCallback(
    (entityName: string, block: BlockDirective) => {
      // Remove the block directive from source
      const lines = currentSource.split('\n');
      const filteredLines = lines.filter((line) => {
        // Check if line is a block directive for this entity
        const isBlockDirective = line.trim().startsWith('%%block:');
        const isForEntity = line.includes(`%%block: ${entityName}`) || line.includes(`%%block:${entityName}`);
        return !(isBlockDirective && isForEntity);
      });
      setSource(filteredLines.join('\n'));
      closeContextMenu();
    },
    [currentSource, setSource, closeContextMenu]
  );

  /**
   * Handle "Copy entity name" from context menu.
   */
  const handleCopyEntityName = useCallback(
    async (entityName: string) => {
      try {
        await navigator.clipboard.writeText(entityName);
        // Could show a toast notification here
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = entityName;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      closeContextMenu();
    },
    [closeContextMenu]
  );

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

  /**
   * Handle snippet insertion from RightPanel.
   */
  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      // Insert snippet at the end of current source
      const newSource = currentSource + '\n' + snippet;
      setSource(newSource);
    },
    [currentSource, setSource]
  );

  /**
   * Handle creating a snapshot from RightPanel.
   */
  const handleCreateSnapshot = useCallback(
    (label?: string) => {
      if (!currentDiagram) return;

      const newVersion: DiagramVersion = {
        id: `version-${Date.now()}`,
        label,
        createdAt: new Date(),
        createdBy: 'Current User',
        isAutoSave: false,
        mermaidSource: currentSource, // Save the current source content
      };
      setVersions((prev) => [newVersion, ...prev]);
    },
    [currentDiagram, currentSource]
  );

  /**
   * Handle restoring a version from RightPanel.
   */
  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (version && version.mermaidSource) {
        // Restore the diagram source to the version's content
        setSource(version.mermaidSource);

        // Create an auto-save of current state before restore
        const autoSaveVersion: DiagramVersion = {
          id: `auto-save-before-restore-${Date.now()}`,
          label: 'Auto-save before restore',
          createdAt: new Date(),
          createdBy: 'Auto-save',
          isAutoSave: true,
          mermaidSource: currentSource, // Save the current source before restoring
        };
        setVersions((prev) => [autoSaveVersion, ...prev]);
      }
    },
    [versions, currentSource, setSource]
  );

  /**
   * Handle selecting a version for preview from RightPanel.
   */
  const handleSelectVersion = useCallback((versionId: string) => {
    // In production, this would show a preview of the version
  }, []);

  /**
   * Handle settings change from RightPanel.
   */
  const handleSettingsChange = useCallback(
    (changes: Partial<DiagramSettings>) => {
      setSettings((prev) => ({ ...prev, ...changes }));
    },
    []
  );

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

  // Get entity info for context menu
  const contextMenuEntityName = contextMenuState.targetData?.entityName ?? '';
  const contextMenuEntityInfo = contextMenuState.targetData?.entityInfo ?? null;
  const hasExistingBlock = contextMenuEntityInfo?.hasBlock ?? false;
  const contextMenuBlock = contextMenuEntityInfo?.block;

  return (
    <>
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
            isDirty={autoSaveIsDirty || diagramState.isDirty}
            isSaving={autoSaveIsSaving || diagramState.isSaving}
            lastSavedAt={autoSaveLastSavedAt || diagramState.lastSavedAt}
            saveError={autoSaveSaveError}
            onManualSave={manualSave}
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
            mermaidTheme={settings.mermaidTheme}
            isDarkMode={isDarkMode}
            onEditorChange={handleEditorChange}
            onRenderSuccess={handleRenderSuccess}
            onRenderError={handleRenderError}
            onBlockClick={handlePreviewBlockClick}
            onEntityContextMenu={handleEntityContextMenu}
            onSvgProcessed={handleSvgProcessed}
          />
        }
        rightPanel={
          <RightPanel
            diagramId={currentDiagram?.id}
            versions={versions}
            settings={settings}
            currentSource={currentSource}
            onInsertSnippet={handleInsertSnippet}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreVersion={handleRestoreVersion}
            onSelectVersion={handleSelectVersion}
            onSettingsChange={handleSettingsChange}
          />
        }
        footer={<AppFooter depth={depth} />}
        showLeftPanel={showLeftPanel}
        showRightPanel={showRightPanel}
        onLeftPanelToggle={setShowLeftPanel}
        onRightPanelToggle={setShowRightPanel}
      />

      {/* Entity context menu for right-click actions */}
      <EntityContextMenu
        isOpen={contextMenuState.isOpen}
        x={contextMenuState.position.x}
        y={contextMenuState.position.y}
        entityName={contextMenuEntityName}
        block={contextMenuBlock}
        hasExistingBlock={hasExistingBlock}
        onClose={closeContextMenu}
        onLinkToSubdiagram={handleLinkToSubdiagram}
        onCreateSubdiagram={handleCreateSubdiagram}
        onGoToSubdiagram={handleGoToSubdiagram}
        onEditBlock={handleEditBlock}
        onRemoveBlock={handleRemoveBlock}
        onCopyEntityName={handleCopyEntityName}
      />
    </>
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
