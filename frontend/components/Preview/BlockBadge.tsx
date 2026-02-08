'use client';

import { forwardRef, useCallback, useState } from 'react';
import type { BlockDirective } from '@/lib/mermaid/types';

/**
 * Props for the BlockBadge component.
 */
export interface BlockBadgeProps {
  /** The block directive associated with this badge */
  block: BlockDirective;
  /** Callback fired when the badge is clicked */
  onClick?: (block: BlockDirective, event: React.MouseEvent) => void;
  /** Whether the badge is currently hovered (controlled) */
  isHovered?: boolean;
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional CSS class */
  className?: string;
  /** Optional tooltip text (defaults to block label or "View subdiagram") */
  tooltip?: string;
  /** Whether the badge is disabled (e.g., when child diagram doesn't exist) */
  disabled?: boolean;
}

/**
 * Size configurations for the badge variants.
 */
const sizeConfig = {
  sm: {
    container: 'w-4 h-4 text-[10px]',
    icon: 'w-2.5 h-2.5',
  },
  md: {
    container: 'w-5 h-5 text-xs',
    icon: 'w-3 h-3',
  },
  lg: {
    container: 'w-6 h-6 text-sm',
    icon: 'w-4 h-4',
  },
};

/**
 * Grid icon component for the block badge.
 * Uses a ▣ style grid pattern to indicate nested content.
 */
function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Outer square */}
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Inner grid pattern */}
      <line
        x1="8"
        y1="1"
        x2="8"
        y2="15"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
      <line
        x1="1"
        y1="8"
        x2="15"
        y2="8"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * BlockBadge component displays a clickable badge on entities with block directives.
 *
 * The badge provides visual indication that an entity has a nested subdiagram
 * and allows users to click to navigate to the child diagram.
 *
 * Features:
 * - Hover effects with scale animation
 * - Tooltip showing the block label or default text
 * - Accessible keyboard navigation support
 * - Disabled state for missing child diagrams
 *
 * @example
 * ```tsx
 * <BlockBadge
 *   block={{ entityKey: "User", childDiagramId: "abc123", label: "User Details" }}
 *   onClick={(block) => navigateTo(block.childDiagramId)}
 *   size="md"
 * />
 * ```
 */
export const BlockBadge = forwardRef<HTMLButtonElement, BlockBadgeProps>(
  function BlockBadge(
    {
      block,
      onClick,
      isHovered: controlledHover,
      size = 'md',
      className = '',
      tooltip,
      disabled = false,
    },
    ref
  ) {
    // Internal hover state for uncontrolled mode
    const [internalHover, setInternalHover] = useState(false);

    // Use controlled hover state if provided, otherwise use internal
    const isHovered = controlledHover ?? internalHover;

    // Handle click event
    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (disabled) return;

        event.preventDefault();
        event.stopPropagation();
        onClick?.(block, event);
      },
      [block, onClick, disabled]
    );

    // Handle keyboard events for accessibility
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (disabled) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onClick?.(block, event as unknown as React.MouseEvent);
        }
      },
      [block, onClick, disabled]
    );

    // Determine the tooltip text
    const tooltipText = tooltip ?? block.label ?? 'View subdiagram';
    const sizes = sizeConfig[size];

    return (
      <button
        ref={ref}
        type="button"
        className={`
          block-badge
          inline-flex items-center justify-center
          ${sizes.container}
          rounded
          bg-primary text-primary-foreground
          shadow-sm
          border border-primary-foreground/20
          transition-all duration-150 ease-in-out
          ${isHovered ? 'scale-110 shadow-md' : 'scale-100'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 hover:shadow-md'}
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1
          ${className}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setInternalHover(true)}
        onMouseLeave={() => setInternalHover(false)}
        disabled={disabled}
        title={tooltipText}
        aria-label={`Navigate to ${block.label || block.childDiagramId}`}
        data-entity-key={block.entityKey}
        data-child-diagram-id={block.childDiagramId}
      >
        <GridIcon className={sizes.icon} />
      </button>
    );
  }
);

export default BlockBadge;
