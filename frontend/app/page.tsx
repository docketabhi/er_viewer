'use client';

import { useState } from 'react';
import { MonacoEditor } from '@/components/Editor';

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

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xl font-bold">ER Viewer</h1>
        <p className="text-sm text-muted-foreground">
          Mermaid diagramming with nested ER blocks
        </p>
      </header>

      {/* Main content area - Editor */}
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

        {/* Preview panel placeholder */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-muted-foreground text-sm p-4 text-center">
              <p className="mb-2">Preview will render here</p>
              <p className="text-xs opacity-75">
                (Mermaid preview component coming in next subtask)
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
