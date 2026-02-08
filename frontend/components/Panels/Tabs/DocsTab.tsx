'use client';

import { memo } from 'react';

/**
 * Props for the DocsTab component.
 */
export interface DocsTabProps {
  /** Currently selected diagram ID */
  diagramId?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * External documentation link item.
 */
interface DocLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: 'mermaid' | 'er' | 'external';
}

/**
 * Default documentation links.
 */
const DEFAULT_DOC_LINKS: DocLink[] = [
  {
    id: 'mermaid-syntax',
    title: 'Mermaid Syntax Guide',
    description: 'Official Mermaid.js syntax documentation',
    url: 'https://mermaid.js.org/syntax/entityRelationshipDiagram.html',
    icon: 'mermaid',
  },
  {
    id: 'er-basics',
    title: 'ER Diagram Basics',
    description: 'Learn entity-relationship diagram fundamentals',
    url: 'https://mermaid.js.org/syntax/entityRelationshipDiagram.html#entity-relationship-diagrams',
    icon: 'er',
  },
  {
    id: 'block-directives',
    title: 'Block Directives',
    description: 'How to use %%block: directives for nested diagrams',
    url: '#',
    icon: 'external',
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Quick reference for editor keyboard shortcuts',
    url: '#',
    icon: 'external',
  },
];

/**
 * Icon component for documentation links.
 */
const DocIcon = memo(function DocIcon({ type }: { type: DocLink['icon'] }) {
  switch (type) {
    case 'mermaid':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06l-1.72-1.72 1.72-1.72zm3.44-1.06a.75.75 0 10-1.06 1.06l1.72 1.72-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'er':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
});

/**
 * Documentation link card component.
 */
const DocLinkCard = memo(function DocLinkCard({ link }: { link: DocLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        block
        p-3
        rounded-lg
        border border-border
        hover:border-primary/50
        hover:bg-muted/50
        transition-colors
        group
      "
    >
      <div className="flex items-start gap-3">
        <div className="
          flex-shrink-0
          w-9 h-9
          rounded-md
          bg-primary/10
          text-primary
          flex items-center justify-center
          group-hover:bg-primary/20
          transition-colors
        ">
          <DocIcon type={link.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="
            text-sm font-medium
            text-foreground
            group-hover:text-primary
            transition-colors
          ">
            {link.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {link.description}
          </p>
        </div>
      </div>
    </a>
  );
});

/**
 * Quick reference section component.
 */
const QuickReference = memo(function QuickReference() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Quick Reference
      </h3>
      <div className="space-y-2 text-sm">
        <div className="p-2 bg-muted/50 rounded font-mono text-xs">
          <div className="text-muted-foreground mb-1">Entity Relationship:</div>
          <div>CUSTOMER ||--o{'{'} ORDER : places</div>
        </div>
        <div className="p-2 bg-muted/50 rounded font-mono text-xs">
          <div className="text-muted-foreground mb-1">Block Directive:</div>
          <div>%%block: EntityName -{'>'} diagramId=xxx</div>
        </div>
        <div className="p-2 bg-muted/50 rounded font-mono text-xs">
          <div className="text-muted-foreground mb-1">Cardinality:</div>
          <div>||  exactly one</div>
          <div>o|  zero or one</div>
          <div>{'}'}-  one or more</div>
          <div>o{'{'} zero or more</div>
        </div>
      </div>
    </div>
  );
});

/**
 * DocsTab component for displaying documentation links and quick reference.
 *
 * Features:
 * - Links to official Mermaid documentation
 * - Quick reference for common syntax patterns
 * - Keyboard shortcuts reference
 *
 * @example
 * ```tsx
 * <DocsTab diagramId="diagram-123" />
 * ```
 */
export const DocsTab = memo(function DocsTab({
  className = '',
}: DocsTabProps) {
  return (
    <div
      className={`
        docs-tab
        h-full
        flex flex-col
        overflow-hidden
        ${className}
      `}
    >
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Documentation Links */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Documentation
          </h3>
          <div className="space-y-2">
            {DEFAULT_DOC_LINKS.map((link) => (
              <DocLinkCard key={link.id} link={link} />
            ))}
          </div>
        </div>

        {/* Quick Reference */}
        <QuickReference />
      </div>
    </div>
  );
});

export default DocsTab;
