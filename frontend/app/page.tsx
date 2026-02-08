'use client';

import { useState, useCallback } from 'react';
import { MonacoEditor } from '@/components/Editor';
import { MermaidPreview } from '@/components/Preview';

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

export default function Home() {
  const [mermaidSource, setMermaidSource] = useState(DEFAULT_MERMAID_SOURCE);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleRenderSuccess = useCallback(() => {
    setRenderError(null);
  }, []);

  const handleRenderError = useCallback((error: Error) => {
    setRenderError(error.message);
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xl font-bold">ER Viewer</h1>
        <div className="flex items-center gap-4">
          {renderError && (
            <span className="text-xs text-destructive">Syntax error</span>
          )}
          <p className="text-sm text-muted-foreground">
            Mermaid diagramming with nested ER blocks
          </p>
        </div>
      </header>

      {/* Main content area - Editor and Preview */}
      <div className="flex-1 flex">
        {/* Editor panel */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium">Editor</span>
          </div>
          <div className="flex-1">
            <MonacoEditor
              value={mermaidSource}
              onChange={(value) => setMermaidSource(value ?? '')}
              theme="vs-dark"
            />
          </div>
        </div>

        {/* Preview panel with Mermaid rendering */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="flex-1">
            <MermaidPreview
              source={mermaidSource}
              isDarkMode={true}
              onRenderSuccess={handleRenderSuccess}
              onRenderError={handleRenderError}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
