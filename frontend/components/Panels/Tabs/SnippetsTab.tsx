'use client';

import {
  useState,
  useCallback,
  memo,
} from 'react';

/**
 * Props for the SnippetsTab component.
 */
export interface SnippetsTabProps {
  /** Callback when a snippet is inserted */
  onInsert?: (snippet: string) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Snippet definition.
 */
interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  category: 'entity' | 'relationship' | 'template' | 'block';
}

/**
 * Default code snippets.
 */
const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'basic-entity',
    title: 'Basic Entity',
    description: 'Simple entity with string attributes',
    code: `ENTITY_NAME {
    string id PK
    string name
    string description
}`,
    category: 'entity',
  },
  {
    id: 'entity-with-types',
    title: 'Entity with Types',
    description: 'Entity with various attribute types',
    code: `ENTITY_NAME {
    int id PK
    string name
    datetime created_at
    boolean is_active
    float amount
}`,
    category: 'entity',
  },
  {
    id: 'one-to-many',
    title: 'One-to-Many',
    description: 'One-to-many relationship pattern',
    code: `PARENT ||--o{ CHILD : "has"`,
    category: 'relationship',
  },
  {
    id: 'many-to-many',
    title: 'Many-to-Many',
    description: 'Many-to-many relationship with junction',
    code: `ENTITY_A }o--o{ ENTITY_B : "relates"`,
    category: 'relationship',
  },
  {
    id: 'one-to-one',
    title: 'One-to-One',
    description: 'One-to-one relationship pattern',
    code: `ENTITY_A ||--|| ENTITY_B : "has"`,
    category: 'relationship',
  },
  {
    id: 'optional-rel',
    title: 'Optional Relationship',
    description: 'Zero or one relationship',
    code: `ENTITY_A |o--o| ENTITY_B : "may have"`,
    category: 'relationship',
  },
  {
    id: 'basic-template',
    title: 'Basic ER Diagram',
    description: 'Simple two-entity diagram template',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string id PK
        string name
        string email
    }
    ORDER {
        string id PK
        datetime order_date
        float total
    }`,
    category: 'template',
  },
  {
    id: 'ecommerce-template',
    title: 'E-Commerce Template',
    description: 'Common e-commerce entities',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"

    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        datetime created_at
        string status
    }
    ORDER_ITEM {
        int id PK
        int quantity
        float price
    }
    PRODUCT {
        int id PK
        string name
        float price
    }`,
    category: 'template',
  },
  {
    id: 'block-directive',
    title: 'Block Directive',
    description: 'Link entity to sub-diagram',
    code: `%%block: ENTITY_NAME -> diagramId=xxx label="View Details"`,
    category: 'block',
  },
];

/**
 * Category filter options.
 */
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'entity', label: 'Entities' },
  { id: 'relationship', label: 'Relations' },
  { id: 'template', label: 'Templates' },
  { id: 'block', label: 'Blocks' },
] as const;

type CategoryFilter = typeof CATEGORIES[number]['id'];

/**
 * Snippet card component.
 */
const SnippetCard = memo(function SnippetCard({
  snippet,
  onInsert,
}: {
  snippet: Snippet;
  onInsert?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet.code]);

  const handleInsert = useCallback(() => {
    onInsert?.(snippet.code);
  }, [snippet.code, onInsert]);

  return (
    <div className="
      border border-border
      rounded-lg
      overflow-hidden
      hover:border-primary/50
      transition-colors
    ">
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            {snippet.title}
          </h4>
          <span className="
            text-[10px] uppercase tracking-wide
            px-1.5 py-0.5
            rounded
            bg-muted
            text-muted-foreground
          ">
            {snippet.category}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {snippet.description}
        </p>
      </div>

      {/* Code Preview */}
      <div className="p-2 bg-background">
        <pre className="
          text-xs font-mono
          text-foreground
          overflow-x-auto
          max-h-24
          whitespace-pre
        ">
          {snippet.code}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <button
          type="button"
          onClick={handleCopy}
          className="
            flex-1
            px-3 py-2
            text-xs font-medium
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted/50
            transition-colors
            border-r border-border
          "
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={handleInsert}
          className="
            flex-1
            px-3 py-2
            text-xs font-medium
            text-primary
            hover:bg-primary/10
            transition-colors
          "
        >
          Insert
        </button>
      </div>
    </div>
  );
});

/**
 * SnippetsTab component for displaying and inserting code snippets.
 *
 * Features:
 * - Categorized snippets (entities, relationships, templates, blocks)
 * - Copy to clipboard functionality
 * - Insert directly into editor
 * - Filter by category
 *
 * @example
 * ```tsx
 * <SnippetsTab onInsert={(code) => insertIntoEditor(code)} />
 * ```
 */
export const SnippetsTab = memo(function SnippetsTab({
  onInsert,
  className = '',
}: SnippetsTabProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredSnippets = activeCategory === 'all'
    ? DEFAULT_SNIPPETS
    : DEFAULT_SNIPPETS.filter((s) => s.category === activeCategory);

  return (
    <div
      className={`
        snippets-tab
        h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
    >
      {/* Category Filter */}
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-2 py-1
              text-xs font-medium
              rounded
              whitespace-nowrap
              transition-colors
              ${activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-3">
          {filteredSnippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onInsert={onInsert}
            />
          ))}
        </div>

        {filteredSnippets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No snippets in this category
          </div>
        )}
      </div>
    </div>
  );
});

export default SnippetsTab;
