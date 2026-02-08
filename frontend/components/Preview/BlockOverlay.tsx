'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type RefObject,
} from 'react';
import type { BlockDirective } from '@/lib/mermaid/types';
import type { EntityNodeInfo, ProcessedSvg } from '@/lib/mermaid/svgProcessor';
import { BlockBadge, type BlockBadgeProps } from './BlockBadge';

/**
 * Position for a badge overlay.
 */
export interface BadgePosition {
  /** X coordinate relative to the container */
  x: number;
  /** Y coordinate relative to the container */
  y: number;
  /** The block directive */
  block: BlockDirective;
  /** The entity name */
  entityName: string;
  /** Whether the badge is visible */
  visible: boolean;
}

/**
 * Props for the BlockOverlay component.
 */
export interface BlockOverlayProps {
  /** Reference to the container element (usually the SVG preview container) */
  containerRef: RefObject<HTMLElement | null>;
  /** The processed SVG info with entity nodes */
  processedSvg: ProcessedSvg | null;
  /** Callback fired when a badge is clicked */
  onBlockClick?: (block: BlockDirective, event: React.MouseEvent) => void;
  /** Size of the badges */
  badgeSize?: BlockBadgeProps['size'];
  /** Position of badges relative to entity: 'top-right', 'top-left', 'bottom-right', 'bottom-left' */
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Offset from the entity corner in pixels */
  badgeOffset?: { x: number; y: number };
  /** Whether badges are visible */
  visible?: boolean;
  /** Additional CSS class for the overlay container */
  className?: string;
  /** Map of entity keys to disabled state (e.g., missing child diagrams) */
  disabledBlocks?: Map<string, boolean>;
}

/**
 * Default offset for badge positioning.
 */
const DEFAULT_OFFSET = { x: -4, y: -4 };

/**
 * Calculate badge position based on entity bounding box and position preference.
 */
function calculateBadgePosition(
  boundingBox: DOMRect,
  position: BlockOverlayProps['badgePosition'],
  offset: { x: number; y: number },
  containerRect: DOMRect
): { x: number; y: number } {
  // Calculate the entity position relative to the container
  const relativeX = boundingBox.x - containerRect.x;
  const relativeY = boundingBox.y - containerRect.y;

  switch (position) {
    case 'top-left':
      return {
        x: relativeX + offset.x,
        y: relativeY + offset.y,
      };
    case 'top-right':
      return {
        x: relativeX + boundingBox.width + offset.x,
        y: relativeY + offset.y,
      };
    case 'bottom-left':
      return {
        x: relativeX + offset.x,
        y: relativeY + boundingBox.height + offset.y,
      };
    case 'bottom-right':
      return {
        x: relativeX + boundingBox.width + offset.x,
        y: relativeY + boundingBox.height + offset.y,
      };
    default:
      return {
        x: relativeX + boundingBox.width + offset.x,
        y: relativeY + offset.y,
      };
  }
}

/**
 * BlockOverlay component renders clickable badge overlays on entities with block directives.
 *
 * This component creates an absolute-positioned overlay layer on top of the SVG preview,
 * placing BlockBadge components at the corners of entities that have linked subdiagrams.
 *
 * The component:
 * - Uses the ProcessedSvg result to identify entities with blocks
 * - Calculates badge positions based on entity bounding boxes
 * - Updates positions when the container scrolls or resizes
 * - Provides click handling for navigation to child diagrams
 *
 * @example
 * ```tsx
 * <div ref={containerRef} className="relative">
 *   <MermaidPreview source={source} />
 *   <BlockOverlay
 *     containerRef={containerRef}
 *     processedSvg={processedSvg}
 *     onBlockClick={(block) => navigate(`/diagram/${block.childDiagramId}`)}
 *   />
 * </div>
 * ```
 */
export function BlockOverlay({
  containerRef,
  processedSvg,
  onBlockClick,
  badgeSize = 'md',
  badgePosition = 'top-right',
  badgeOffset = DEFAULT_OFFSET,
  visible = true,
  className = '',
  disabledBlocks,
}: BlockOverlayProps) {
  // State for badge positions
  const [badgePositions, setBadgePositions] = useState<BadgePosition[]>([]);

  // Ref to track if positions need recalculating
  const needsRecalc = useRef(true);

  /**
   * Calculate positions for all badges based on entity bounding boxes.
   */
  const calculatePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container || !processedSvg?.entityNodes) {
      setBadgePositions([]);
      return;
    }

    const svg = container.querySelector('svg');
    if (!svg) {
      setBadgePositions([]);
      return;
    }

    // Get container rect for relative positioning
    const containerRect = container.getBoundingClientRect();
    const positions: BadgePosition[] = [];

    // Calculate position for each entity with a block
    processedSvg.entityNodes.forEach((nodeInfo: EntityNodeInfo, entityName: string) => {
      if (!nodeInfo.hasBlock || !nodeInfo.block) {
        return;
      }

      // Get fresh bounding box for the entity element
      let boundingBox: DOMRect;

      try {
        // Try to get the element's bounding client rect
        boundingBox = nodeInfo.element.getBoundingClientRect();
      } catch {
        // Fall back to stored bounding box if element is no longer valid
        boundingBox = nodeInfo.boundingBox;
      }

      // Calculate badge position
      const pos = calculateBadgePosition(
        boundingBox,
        badgePosition,
        badgeOffset,
        containerRect
      );

      positions.push({
        x: pos.x,
        y: pos.y,
        block: nodeInfo.block,
        entityName,
        visible: true,
      });
    });

    setBadgePositions(positions);
    needsRecalc.current = false;
  }, [containerRef, processedSvg, badgePosition, badgeOffset]);

  /**
   * Update badge positions on scroll or resize.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate initial positions
    calculatePositions();

    // Set up scroll listener on the container
    const handleScroll = () => {
      needsRecalc.current = true;
      requestAnimationFrame(calculatePositions);
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      needsRecalc.current = true;
      requestAnimationFrame(calculatePositions);
    });

    container.addEventListener('scroll', handleScroll);
    resizeObserver.observe(container);

    // Also observe window resize
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef, calculatePositions]);

  /**
   * Recalculate positions when processedSvg changes.
   */
  useEffect(() => {
    if (processedSvg) {
      // Delay calculation slightly to ensure SVG is rendered
      const timer = setTimeout(() => {
        calculatePositions();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [processedSvg, calculatePositions]);

  // Don't render if not visible or no badges
  if (!visible || badgePositions.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        block-overlay
        absolute inset-0
        pointer-events-none
        overflow-hidden
        ${className}
      `}
      aria-label="Block navigation overlay"
      role="navigation"
    >
      {badgePositions.map((pos) => (
        <div
          key={`badge-${pos.entityName}`}
          className="absolute pointer-events-auto"
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        >
          <BlockBadge
            block={pos.block}
            onClick={onBlockClick}
            size={badgeSize}
            disabled={disabledBlocks?.get(pos.entityName) ?? false}
            tooltip={pos.block.label || `Navigate to ${pos.entityName} details`}
          />
        </div>
      ))}
    </div>
  );
}

export default BlockOverlay;
