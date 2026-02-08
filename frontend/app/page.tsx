'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MonacoEditor } from '@/components/Editor';
import { MermaidPreview } from '@/components/Preview';
import { Breadcrumb, BackButton } from '@/components/Navigation';
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
 * Main content component that uses the diagram navigation context.
 */
function DiagramViewer() {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<ProcessedSvg | null>(null);

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

  // Loading state during navigation
  if (isNavigating) {
    return (
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading diagram...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header with navigation */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">ER Viewer</h1>

          {/* Back button - only show when can go back */}
          {canGoBack && (
            <BackButton onClick={goBack} size="sm" />
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Render error indicator */}
          {renderError && (
            <span className="text-xs text-destructive">Syntax error</span>
          )}

          {/* Depth indicator */}
          {depth > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Depth: {depth}
            </span>
          )}

          <p className="text-sm text-muted-foreground">
            Mermaid diagramming with nested ER blocks
          </p>
        </div>
      </header>

      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <Breadcrumb
            items={breadcrumbs}
            onItemClick={handleBreadcrumbClick}
            showHomeIcon
            size="sm"
            maxItems={5}
          />
        </div>
      )}

      {/* Main content area - Editor and Preview */}
      <div className="flex-1 flex">
        {/* Editor panel */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <span className="text-sm font-medium">Editor</span>
            {currentDiagram && (
              <span className="text-xs text-muted-foreground">
                {currentDiagram.title}
              </span>
            )}
          </div>
          <div className="flex-1">
            <MonacoEditor
              value={currentSource}
              onChange={handleEditorChange}
              theme="vs-dark"
            />
          </div>
        </div>

        {/* Preview panel with Mermaid rendering */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            {processedSvg && processedSvg.entityNodes.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {processedSvg.entityNodes.size} entities
                {processedSvg.blocks.length > 0 && (
                  <> ({processedSvg.blocks.length} with blocks)</>
                )}
              </span>
            )}
          </div>
          <div className="flex-1 relative" ref={previewContainerRef}>
            <MermaidPreview
              source={currentSource}
              isDarkMode={true}
              onRenderSuccess={handleRenderSuccess}
              onRenderError={handleRenderError}
              onBlockClick={handlePreviewBlockClick}
              onSvgProcessed={handleSvgProcessed}
              showBlockIndicators
            />
          </div>
        </div>
      </div>

      {/* Footer with navigation help */}
      {depth > 0 && (
        <footer className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <span>
            Click on block badges to navigate into sub-diagrams.
            {' '}
            Use the breadcrumb or back button to return to parent diagrams.
          </span>
        </footer>
      )}
    </main>
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
