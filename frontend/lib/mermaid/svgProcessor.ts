/**
 * SVG post-processor for Mermaid ER diagrams.
 *
 * Identifies entity nodes in rendered SVG and attaches click handlers
 * for nested block navigation and entity interactions.
 *
 * @module lib/mermaid/svgProcessor
 */

import type { BlockDirective, EntityMap } from './types';
import { parseBlockDirectives, extractEntities } from './parser';

/**
 * Information about an entity node found in the SVG.
 */
export interface EntityNodeInfo {
  /** The entity name */
  name: string;
  /** The DOM element representing this entity */
  element: Element;
  /** Bounding box of the entity in the SVG coordinate system */
  boundingBox: DOMRect;
  /** Associated block directive, if any */
  block?: BlockDirective;
  /** Whether this entity has a block linked to it */
  hasBlock: boolean;
}

/**
 * Result of processing an SVG for entity nodes.
 */
export interface ProcessedSvg {
  /** The SVG element */
  svgElement: SVGSVGElement | null;
  /** Map of entity names to their node information */
  entityNodes: Map<string, EntityNodeInfo>;
  /** Block directives parsed from the source */
  blocks: BlockDirective[];
  /** Total number of entities found */
  entityCount: number;
  /** Number of entities with blocks */
  blockedEntityCount: number;
}

/**
 * Options for processing an SVG.
 */
export interface ProcessSvgOptions {
  /** Callback when an entity is clicked */
  onEntityClick?: (entityName: string, event: MouseEvent) => void;
  /** Callback when an entity is right-clicked */
  onEntityContextMenu?: (entityName: string, event: MouseEvent) => void;
  /** Callback when a block badge is clicked */
  onBlockClick?: (block: BlockDirective, event: MouseEvent) => void;
  /** Callback when mouse enters an entity */
  onEntityMouseEnter?: (entityName: string, event: MouseEvent) => void;
  /** Callback when mouse leaves an entity */
  onEntityMouseLeave?: (entityName: string, event: MouseEvent) => void;
  /** Whether to add visual indicators for entities with blocks */
  addBlockIndicators?: boolean;
  /** CSS class to add to entity nodes */
  entityClassName?: string;
  /** CSS class to add to entities with blocks */
  blockedEntityClassName?: string;
}

/**
 * Default CSS classes for entity styling.
 */
const DEFAULT_ENTITY_CLASS = 'er-entity-node';
const DEFAULT_BLOCKED_ENTITY_CLASS = 'er-entity-with-block';

/**
 * Finds entity nodes in a rendered Mermaid ER diagram SVG.
 *
 * Mermaid generates SVG elements with IDs containing entity names.
 * This function searches for those elements using multiple strategies
 * since Mermaid's ID generation can vary between versions.
 *
 * @param container - The DOM element containing the SVG
 * @param mermaidSource - The original Mermaid source code
 * @returns Map of entity names to their DOM elements and metadata
 *
 * @example
 * ```tsx
 * const entityNodes = findEntityNodes(containerRef.current, source);
 * entityNodes.forEach((info, name) => {
 *   console.log(`Found entity: ${name}`, info.boundingBox);
 * });
 * ```
 */
export function findEntityNodes(
  container: Element,
  mermaidSource: string
): Map<string, EntityNodeInfo> {
  const entityNodes = new Map<string, EntityNodeInfo>();
  const entities = extractEntities(mermaidSource);
  const blocks = parseBlockDirectives(mermaidSource);
  const blocksByEntity = new Map(blocks.map((b) => [b.entityKey, b]));

  // Find SVG element
  const svg = container.querySelector('svg');
  if (!svg) {
    return entityNodes;
  }

  // Search strategies for finding entity elements
  const searchStrategies = [
    // Strategy 1: Look for elements with IDs containing entity name
    (entityName: string) =>
      svg.querySelector(`[id*="${entityName}"]`),
    // Strategy 2: Look for elements with data-id attribute
    (entityName: string) =>
      svg.querySelector(`[data-id*="${entityName}"]`),
    // Strategy 3: Look for entity label elements
    (entityName: string) =>
      svg.querySelector(`g.entityLabel:has(tspan:contains("${entityName}"))`),
    // Strategy 4: Look for text elements containing entity name and find parent
    (entityName: string) => {
      const textElements = svg.querySelectorAll('text, tspan');
      for (const text of textElements) {
        if (text.textContent?.trim() === entityName) {
          // Find the nearest entity group parent
          return findEntityParent(text);
        }
      }
      return null;
    },
    // Strategy 5: Look for entity boxes by ID pattern
    (entityName: string) =>
      svg.querySelector(`g[id$="-${entityName}"], g[id^="${entityName}-"]`),
    // Strategy 6: Look for entity nodes by class and ID combination
    (entityName: string) =>
      svg.querySelector(`.entity[id*="${entityName}"], .er.entityBox[id*="${entityName}"]`),
  ];

  // Try to find each entity using the strategies
  for (const [entityName, entityInfo] of entities) {
    let element: Element | null = null;

    // Try each search strategy until we find the element
    for (const strategy of searchStrategies) {
      element = strategy(entityName);
      if (element) {
        break;
      }
    }

    // If still not found, try a more aggressive text-based search
    if (!element) {
      element = findEntityByTextContent(svg, entityName);
    }

    if (element) {
      const block = blocksByEntity.get(entityName);
      const boundingBox = getElementBoundingBox(element, svg);

      entityNodes.set(entityName, {
        name: entityName,
        element,
        boundingBox,
        block,
        hasBlock: !!block,
      });
    }
  }

  return entityNodes;
}

/**
 * Finds the parent group element that represents an entity.
 */
function findEntityParent(element: Element): Element | null {
  let current: Element | null = element;

  while (current) {
    // Check if this is likely an entity group
    if (
      current.tagName === 'g' &&
      (current.classList.contains('entity') ||
        current.id?.includes('entity') ||
        current.querySelector('.entityBox, .entityLabel'))
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Finds an entity by searching for text content in the SVG.
 */
function findEntityByTextContent(
  svg: SVGSVGElement,
  entityName: string
): Element | null {
  // Find all text elements
  const textElements = svg.querySelectorAll('text, tspan');

  for (const text of textElements) {
    const content = text.textContent?.trim();
    if (content === entityName) {
      // Walk up to find the entity group
      let parent = text.parentElement;
      while (parent && parent !== svg) {
        // Check if this looks like an entity group
        if (parent.tagName === 'g') {
          // Check if it has entity-like children
          if (
            parent.querySelector('rect, polygon') &&
            parent.querySelector('text')
          ) {
            return parent;
          }
        }
        parent = parent.parentElement;
      }
    }
  }

  return null;
}

/**
 * Gets the bounding box of an element in SVG coordinates.
 */
function getElementBoundingBox(element: Element, svg: SVGSVGElement): DOMRect {
  // Try getBBox for SVG elements
  if ('getBBox' in element && typeof element.getBBox === 'function') {
    try {
      const bbox = (element as SVGGraphicsElement).getBBox();
      // Get the element's transformation matrix
      const ctm = (element as SVGGraphicsElement).getCTM();
      if (ctm) {
        // Transform the bounding box coordinates
        const svgPoint1 = svg.createSVGPoint();
        svgPoint1.x = bbox.x;
        svgPoint1.y = bbox.y;
        const transformed1 = svgPoint1.matrixTransform(ctm);

        const svgPoint2 = svg.createSVGPoint();
        svgPoint2.x = bbox.x + bbox.width;
        svgPoint2.y = bbox.y + bbox.height;
        const transformed2 = svgPoint2.matrixTransform(ctm);

        return new DOMRect(
          transformed1.x,
          transformed1.y,
          transformed2.x - transformed1.x,
          transformed2.y - transformed1.y
        );
      }
      return new DOMRect(bbox.x, bbox.y, bbox.width, bbox.height);
    } catch {
      // Fall back to getBoundingClientRect
    }
  }

  // Fall back to getBoundingClientRect
  return element.getBoundingClientRect();
}

/**
 * Processes an SVG container to identify entities and attach handlers.
 *
 * This is the main entry point for SVG post-processing. It finds all
 * entity nodes, attaches event handlers, and optionally adds visual
 * indicators for entities with block directives.
 *
 * @param container - The DOM element containing the rendered SVG
 * @param mermaidSource - The original Mermaid source code
 * @param options - Processing options including callbacks
 * @returns Information about the processed SVG
 *
 * @example
 * ```tsx
 * const result = processSvg(containerRef.current, source, {
 *   onEntityClick: (name) => console.log('Clicked:', name),
 *   onBlockClick: (block) => navigateToDiagram(block.childDiagramId),
 *   addBlockIndicators: true,
 * });
 * console.log(`Found ${result.entityCount} entities`);
 * ```
 */
export function processSvg(
  container: Element | null,
  mermaidSource: string,
  options: ProcessSvgOptions = {}
): ProcessedSvg {
  const {
    onEntityClick,
    onEntityContextMenu,
    onBlockClick,
    onEntityMouseEnter,
    onEntityMouseLeave,
    addBlockIndicators = false,
    entityClassName = DEFAULT_ENTITY_CLASS,
    blockedEntityClassName = DEFAULT_BLOCKED_ENTITY_CLASS,
  } = options;

  const result: ProcessedSvg = {
    svgElement: null,
    entityNodes: new Map(),
    blocks: [],
    entityCount: 0,
    blockedEntityCount: 0,
  };

  if (!container) {
    return result;
  }

  // Find the SVG element
  const svg = container.querySelector('svg');
  if (!svg) {
    return result;
  }

  result.svgElement = svg as SVGSVGElement;
  result.blocks = parseBlockDirectives(mermaidSource);

  // Find entity nodes
  result.entityNodes = findEntityNodes(container, mermaidSource);
  result.entityCount = result.entityNodes.size;
  result.blockedEntityCount = [...result.entityNodes.values()].filter(
    (n) => n.hasBlock
  ).length;

  // Attach handlers and styling to each entity
  result.entityNodes.forEach((nodeInfo, entityName) => {
    const { element, hasBlock, block } = nodeInfo;

    // Add CSS classes
    element.classList.add(entityClassName);
    if (hasBlock) {
      element.classList.add(blockedEntityClassName);
    }

    // Set cursor style for clickable entities
    if (onEntityClick || (hasBlock && onBlockClick)) {
      (element as HTMLElement).style.cursor = 'pointer';
    }

    // Attach click handler
    if (onEntityClick || (hasBlock && onBlockClick)) {
      const clickHandler = (event: Event) => {
        const mouseEvent = event as MouseEvent;

        // If entity has a block and onBlockClick is provided, use that
        if (hasBlock && block && onBlockClick) {
          event.preventDefault();
          event.stopPropagation();
          onBlockClick(block, mouseEvent);
          return;
        }

        // Otherwise use general entity click handler
        if (onEntityClick) {
          event.preventDefault();
          event.stopPropagation();
          onEntityClick(entityName, mouseEvent);
        }
      };

      element.addEventListener('click', clickHandler);
      // Store handler reference for potential cleanup
      (element as HTMLElement).dataset.entityClickHandler = 'true';
    }

    // Attach context menu handler
    if (onEntityContextMenu) {
      const contextMenuHandler = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        event.preventDefault();
        event.stopPropagation();
        onEntityContextMenu(entityName, mouseEvent);
      };

      element.addEventListener('contextmenu', contextMenuHandler);
    }

    // Attach mouse enter handler
    if (onEntityMouseEnter) {
      const mouseEnterHandler = (event: Event) => {
        onEntityMouseEnter(entityName, event as MouseEvent);
      };

      element.addEventListener('mouseenter', mouseEnterHandler);
    }

    // Attach mouse leave handler
    if (onEntityMouseLeave) {
      const mouseLeaveHandler = (event: Event) => {
        onEntityMouseLeave(entityName, event as MouseEvent);
      };

      element.addEventListener('mouseleave', mouseLeaveHandler);
    }

    // Add block indicator styling if requested
    if (addBlockIndicators && hasBlock) {
      addBlockIndicatorStyles(element);
    }
  });

  return result;
}

/**
 * Adds visual indicator styles to an entity with a block.
 */
function addBlockIndicatorStyles(element: Element): void {
  // Find the entity box (rect or polygon)
  const box = element.querySelector('rect, polygon');
  if (box) {
    // Add a subtle highlight
    const currentStroke = box.getAttribute('stroke');
    if (!currentStroke || currentStroke === 'none') {
      box.setAttribute('stroke', '#3b82f6');
    }
    box.setAttribute('stroke-width', '2');

    // Add data attribute for CSS targeting
    box.setAttribute('data-has-block', 'true');
  }
}

/**
 * Gets information about a specific entity node.
 *
 * @param container - The DOM element containing the SVG
 * @param mermaidSource - The original Mermaid source code
 * @param entityName - The entity name to find
 * @returns Entity node info or null if not found
 */
export function getEntityNodeInfo(
  container: Element,
  mermaidSource: string,
  entityName: string
): EntityNodeInfo | null {
  const nodes = findEntityNodes(container, mermaidSource);
  return nodes.get(entityName) || null;
}

/**
 * Checks if an entity exists in the rendered SVG.
 *
 * @param container - The DOM element containing the SVG
 * @param mermaidSource - The original Mermaid source code
 * @param entityName - The entity name to check
 * @returns True if the entity is found in the SVG
 */
export function hasEntityNode(
  container: Element,
  mermaidSource: string,
  entityName: string
): boolean {
  const nodes = findEntityNodes(container, mermaidSource);
  return nodes.has(entityName);
}

/**
 * Gets all entity names found in the rendered SVG.
 *
 * @param container - The DOM element containing the SVG
 * @param mermaidSource - The original Mermaid source code
 * @returns Array of entity names
 */
export function getEntityNames(
  container: Element,
  mermaidSource: string
): string[] {
  const nodes = findEntityNodes(container, mermaidSource);
  return [...nodes.keys()];
}

/**
 * Gets the bounding box of an entity in the SVG.
 *
 * @param container - The DOM element containing the SVG
 * @param mermaidSource - The original Mermaid source code
 * @param entityName - The entity name
 * @returns Bounding box or null if entity not found
 */
export function getEntityBoundingBox(
  container: Element,
  mermaidSource: string,
  entityName: string
): DOMRect | null {
  const nodeInfo = getEntityNodeInfo(container, mermaidSource, entityName);
  return nodeInfo?.boundingBox || null;
}

/**
 * Cleans up event handlers attached to entity nodes.
 *
 * Call this before re-processing an SVG to prevent memory leaks.
 *
 * @param container - The DOM element containing the SVG
 */
export function cleanupEntityHandlers(container: Element | null): void {
  if (!container) {
    return;
  }

  // Find all elements with entity click handlers
  const elements = container.querySelectorAll('[data-entity-click-handler]');
  elements.forEach((element) => {
    // Clone and replace to remove all event listeners
    const clone = element.cloneNode(true);
    element.parentNode?.replaceChild(clone, element);
  });
}

/**
 * Applies hover styles to entity nodes.
 *
 * Adds CSS styles for hover effects on entity nodes.
 * Call this after processSvg() to enable hover effects.
 *
 * @param container - The DOM element containing the SVG
 */
export function applyEntityHoverStyles(container: Element | null): void {
  if (!container) {
    return;
  }

  const svg = container.querySelector('svg');
  if (!svg) {
    return;
  }

  // Check if we already added styles
  if (svg.querySelector('#er-entity-hover-styles')) {
    return;
  }

  // Create style element
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.id = 'er-entity-hover-styles';
  style.textContent = `
    .${DEFAULT_ENTITY_CLASS} {
      transition: opacity 0.15s ease-in-out;
    }
    .${DEFAULT_ENTITY_CLASS}:hover {
      opacity: 0.85;
    }
    .${DEFAULT_BLOCKED_ENTITY_CLASS} rect,
    .${DEFAULT_BLOCKED_ENTITY_CLASS} polygon {
      transition: stroke-width 0.15s ease-in-out;
    }
    .${DEFAULT_BLOCKED_ENTITY_CLASS}:hover rect,
    .${DEFAULT_BLOCKED_ENTITY_CLASS}:hover polygon {
      stroke-width: 3px;
    }
  `;

  svg.insertBefore(style, svg.firstChild);
}

/**
 * Position information for a block badge.
 */
export interface BlockBadgePosition {
  /** Entity name */
  entityName: string;
  /** Block directive */
  block: BlockDirective;
  /** X coordinate relative to container */
  x: number;
  /** Y coordinate relative to container */
  y: number;
  /** Width of the entity */
  width: number;
  /** Height of the entity */
  height: number;
}

/**
 * Badge position preference relative to entity.
 */
export type BadgePositionPreference =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

/**
 * Calculates badge positions for all entities with blocks.
 *
 * This function is useful for positioning React overlay components
 * like BlockBadge on top of the SVG.
 *
 * @param container - The container element with the SVG
 * @param processedSvg - The processed SVG result
 * @param position - Where to position badges relative to entities
 * @param offset - Pixel offset from the position
 * @returns Array of badge positions
 *
 * @example
 * ```tsx
 * const positions = getBlockBadgePositions(
 *   containerRef.current,
 *   processedSvg,
 *   'top-right',
 *   { x: -8, y: -8 }
 * );
 * ```
 */
export function getBlockBadgePositions(
  container: Element | null,
  processedSvg: ProcessedSvg,
  position: BadgePositionPreference = 'top-right',
  offset: { x: number; y: number } = { x: 0, y: 0 }
): BlockBadgePosition[] {
  const positions: BlockBadgePosition[] = [];

  if (!container || !processedSvg.entityNodes) {
    return positions;
  }

  const containerRect = container.getBoundingClientRect();

  processedSvg.entityNodes.forEach((nodeInfo, entityName) => {
    if (!nodeInfo.hasBlock || !nodeInfo.block) {
      return;
    }

    // Get the current bounding box of the entity
    let bbox: DOMRect;
    try {
      bbox = nodeInfo.element.getBoundingClientRect();
    } catch {
      bbox = nodeInfo.boundingBox;
    }

    // Calculate relative position within container
    const relativeX = bbox.x - containerRect.x;
    const relativeY = bbox.y - containerRect.y;

    // Calculate badge position based on preference
    let x: number;
    let y: number;

    switch (position) {
      case 'top-left':
        x = relativeX + offset.x;
        y = relativeY + offset.y;
        break;
      case 'top-right':
        x = relativeX + bbox.width + offset.x;
        y = relativeY + offset.y;
        break;
      case 'bottom-left':
        x = relativeX + offset.x;
        y = relativeY + bbox.height + offset.y;
        break;
      case 'bottom-right':
        x = relativeX + bbox.width + offset.x;
        y = relativeY + bbox.height + offset.y;
        break;
      default:
        x = relativeX + bbox.width + offset.x;
        y = relativeY + offset.y;
    }

    positions.push({
      entityName,
      block: nodeInfo.block,
      x,
      y,
      width: bbox.width,
      height: bbox.height,
    });
  });

  return positions;
}

/**
 * Gets the SVG element from a container.
 *
 * @param container - The container element
 * @returns The SVG element or null
 */
export function getSvgElement(container: Element | null): SVGSVGElement | null {
  if (!container) {
    return null;
  }
  return container.querySelector('svg') as SVGSVGElement | null;
}

/**
 * Gets the viewBox of an SVG element.
 *
 * @param svg - The SVG element
 * @returns The viewBox values or null
 */
export function getSvgViewBox(
  svg: SVGSVGElement | null
): { x: number; y: number; width: number; height: number } | null {
  if (!svg) {
    return null;
  }

  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) {
    return null;
  }

  const parts = viewBox.split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
}
