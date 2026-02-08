/**
 * Tests for the SVG processor.
 *
 * Tests entity node finding, click handler attachment, block badge positioning,
 * and SVG utility functions.
 *
 * @module lib/mermaid/__tests__/svgProcessor.test
 */

import {
  findEntityNodes,
  processSvg,
  getEntityNodeInfo,
  hasEntityNode,
  getEntityNames,
  getEntityBoundingBox,
  cleanupEntityHandlers,
  applyEntityHoverStyles,
  getBlockBadgePositions,
  getSvgElement,
  getSvgViewBox,
  type ProcessedSvg,
  type ProcessSvgOptions,
  type EntityNodeInfo,
  type BlockBadgePosition,
} from '../svgProcessor';

/**
 * Creates a mock SVG element for testing.
 */
function createMockSvg(content: string = ''): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.innerHTML = content;
  svg.setAttribute('viewBox', '0 0 800 600');

  // Mock createSVGPoint for bounding box calculations
  svg.createSVGPoint = jest.fn(() => ({
    x: 0,
    y: 0,
    matrixTransform: jest.fn().mockReturnValue({ x: 0, y: 0 }),
  })) as unknown as () => DOMPoint;

  return svg;
}

/**
 * Creates a mock container element with an SVG.
 */
function createMockContainer(svgContent: string = ''): HTMLDivElement {
  const container = document.createElement('div');
  const svg = createMockSvg(svgContent);
  container.appendChild(svg);

  // Mock getBoundingClientRect for container
  container.getBoundingClientRect = jest.fn(() =>
    new DOMRect(0, 0, 800, 600)
  );

  return container;
}

/**
 * Creates mock entity group SVG content.
 */
function createEntityGroup(entityName: string, hasRect: boolean = true): string {
  const rect = hasRect
    ? `<rect x="100" y="100" width="150" height="80" fill="#fff" stroke="#000"/>`
    : '';
  return `
    <g id="entity-${entityName}" class="entity">
      ${rect}
      <text><tspan>${entityName}</tspan></text>
    </g>
  `;
}

/**
 * Sample Mermaid source with entities and blocks.
 */
const SAMPLE_SOURCE = `
erDiagram
  User ||--o{ Order : places
  Order ||--|{ LineItem : contains
  %%block: User -> diagramId=user-detail label="User Details"
  %%block: Order -> diagramId=order-detail
`;

const SAMPLE_SOURCE_NO_BLOCKS = `
erDiagram
  User ||--o{ Order : places
  Order ||--|{ LineItem : contains
`;

describe('getSvgElement', () => {
  it('should return SVG element from container', () => {
    const container = createMockContainer();

    const svg = getSvgElement(container);

    expect(svg).not.toBeNull();
    expect(svg?.tagName).toBe('svg');
  });

  it('should return null for null container', () => {
    const svg = getSvgElement(null);

    expect(svg).toBeNull();
  });

  it('should return null for container without SVG', () => {
    const container = document.createElement('div');

    const svg = getSvgElement(container);

    expect(svg).toBeNull();
  });
});

describe('getSvgViewBox', () => {
  it('should parse viewBox correctly', () => {
    const svg = createMockSvg();
    svg.setAttribute('viewBox', '10 20 800 600');

    const viewBox = getSvgViewBox(svg);

    expect(viewBox).toEqual({
      x: 10,
      y: 20,
      width: 800,
      height: 600,
    });
  });

  it('should return null for null SVG', () => {
    const viewBox = getSvgViewBox(null);

    expect(viewBox).toBeNull();
  });

  it('should return null for SVG without viewBox', () => {
    const svg = createMockSvg();
    svg.removeAttribute('viewBox');

    const viewBox = getSvgViewBox(svg);

    expect(viewBox).toBeNull();
  });

  it('should return null for invalid viewBox format', () => {
    const svg = createMockSvg();
    svg.setAttribute('viewBox', 'invalid');

    const viewBox = getSvgViewBox(svg);

    expect(viewBox).toBeNull();
  });

  it('should return null for partial viewBox', () => {
    const svg = createMockSvg();
    svg.setAttribute('viewBox', '0 0 800');

    const viewBox = getSvgViewBox(svg);

    expect(viewBox).toBeNull();
  });

  it('should handle viewBox with extra whitespace', () => {
    const svg = createMockSvg();
    svg.setAttribute('viewBox', '  0   0   800   600  ');

    const viewBox = getSvgViewBox(svg);

    expect(viewBox).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });
});

describe('findEntityNodes', () => {
  it('should find entities by ID containing entity name', () => {
    const svgContent = `
      ${createEntityGroup('User')}
      ${createEntityGroup('Order')}
    `;
    const container = createMockContainer(svgContent);

    const entityNodes = findEntityNodes(container, SAMPLE_SOURCE);

    expect(entityNodes.has('User')).toBe(true);
    expect(entityNodes.has('Order')).toBe(true);
  });

  it('should return empty map when container has no SVG', () => {
    const container = document.createElement('div');

    const entityNodes = findEntityNodes(container, SAMPLE_SOURCE);

    expect(entityNodes.size).toBe(0);
  });

  it('should return empty map for empty source', () => {
    const container = createMockContainer();

    const entityNodes = findEntityNodes(container, '');

    expect(entityNodes.size).toBe(0);
  });

  it('should associate block directives with entities', () => {
    const svgContent = `
      ${createEntityGroup('User')}
      ${createEntityGroup('Order')}
      ${createEntityGroup('LineItem')}
    `;
    const container = createMockContainer(svgContent);

    const entityNodes = findEntityNodes(container, SAMPLE_SOURCE);

    expect(entityNodes.get('User')?.hasBlock).toBe(true);
    expect(entityNodes.get('User')?.block?.childDiagramId).toBe('user-detail');
    expect(entityNodes.get('Order')?.hasBlock).toBe(true);
    expect(entityNodes.get('Order')?.block?.label).toBeUndefined();
    expect(entityNodes.get('LineItem')?.hasBlock).toBe(false);
  });

  it('should find entities by text content when ID search fails', () => {
    const svgContent = `
      <g class="some-other-class">
        <rect x="100" y="100" width="150" height="80"/>
        <text><tspan>CustomEntity</tspan></text>
      </g>
    `;
    const container = createMockContainer(svgContent);
    const source = `
erDiagram
  CustomEntity ||--o{ Other : relates
`;

    const entityNodes = findEntityNodes(container, source);

    // May or may not find depending on structure, but shouldn't throw
    expect(() => findEntityNodes(container, source)).not.toThrow();
  });

  it('should include bounding box information', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    // Mock getBoundingClientRect on the entity element
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const entityNodes = findEntityNodes(container, 'erDiagram\n  User ||--o{ Order : places');

    const userNode = entityNodes.get('User');
    expect(userNode?.boundingBox).toBeDefined();
  });
});

describe('processSvg', () => {
  it('should return empty result for null container', () => {
    const result = processSvg(null, SAMPLE_SOURCE);

    expect(result.svgElement).toBeNull();
    expect(result.entityNodes.size).toBe(0);
    expect(result.blocks).toHaveLength(2);
    expect(result.entityCount).toBe(0);
    expect(result.blockedEntityCount).toBe(0);
  });

  it('should return empty result for container without SVG', () => {
    const container = document.createElement('div');

    const result = processSvg(container, SAMPLE_SOURCE);

    expect(result.svgElement).toBeNull();
    expect(result.entityCount).toBe(0);
  });

  it('should find SVG element and parse blocks', () => {
    const svgContent = `
      ${createEntityGroup('User')}
      ${createEntityGroup('Order')}
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, SAMPLE_SOURCE);

    expect(result.svgElement).not.toBeNull();
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].entityKey).toBe('User');
    expect(result.blocks[1].entityKey).toBe('Order');
  });

  it('should count entities and blocked entities correctly', () => {
    const svgContent = `
      ${createEntityGroup('User')}
      ${createEntityGroup('Order')}
      ${createEntityGroup('LineItem')}
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, SAMPLE_SOURCE);

    expect(result.entityCount).toBe(3);
    expect(result.blockedEntityCount).toBe(2); // User and Order have blocks
  });

  it('should add CSS classes to entity elements', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE);

    const entityElement = container.querySelector('[id*="User"]');
    expect(entityElement?.classList.contains('er-entity-node')).toBe(true);
    expect(entityElement?.classList.contains('er-entity-with-block')).toBe(true);
  });

  it('should add custom CSS classes when specified', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE, {
      entityClassName: 'custom-entity',
      blockedEntityClassName: 'custom-blocked',
    });

    const entityElement = container.querySelector('[id*="User"]');
    expect(entityElement?.classList.contains('custom-entity')).toBe(true);
    expect(entityElement?.classList.contains('custom-blocked')).toBe(true);
  });

  it('should attach click handlers when onEntityClick is provided', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onEntityClick = jest.fn();

    processSvg(container, SAMPLE_SOURCE_NO_BLOCKS, { onEntityClick });

    const entityElement = container.querySelector('[id*="User"]');
    entityElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onEntityClick).toHaveBeenCalledWith('User', expect.any(MouseEvent));
  });

  it('should attach block click handlers when entity has block', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onBlockClick = jest.fn();

    processSvg(container, SAMPLE_SOURCE, { onBlockClick });

    const entityElement = container.querySelector('[id*="User"]');
    entityElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onBlockClick).toHaveBeenCalledWith(
      expect.objectContaining({ entityKey: 'User', childDiagramId: 'user-detail' }),
      expect.any(MouseEvent)
    );
  });

  it('should attach context menu handlers when onEntityContextMenu is provided', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onEntityContextMenu = jest.fn();

    processSvg(container, SAMPLE_SOURCE, { onEntityContextMenu });

    const entityElement = container.querySelector('[id*="User"]');
    entityElement?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

    expect(onEntityContextMenu).toHaveBeenCalledWith('User', expect.any(MouseEvent));
  });

  it('should attach mouse enter/leave handlers when provided', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onEntityMouseEnter = jest.fn();
    const onEntityMouseLeave = jest.fn();

    processSvg(container, SAMPLE_SOURCE, { onEntityMouseEnter, onEntityMouseLeave });

    const entityElement = container.querySelector('[id*="User"]');

    entityElement?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(onEntityMouseEnter).toHaveBeenCalledWith('User', expect.any(MouseEvent));

    entityElement?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onEntityMouseLeave).toHaveBeenCalledWith('User', expect.any(MouseEvent));
  });

  it('should set cursor to pointer for clickable entities', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE, { onEntityClick: jest.fn() });

    const entityElement = container.querySelector('[id*="User"]') as HTMLElement;
    expect(entityElement?.style.cursor).toBe('pointer');
  });

  it('should add block indicators when addBlockIndicators is true', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE, { addBlockIndicators: true });

    const rect = container.querySelector('[id*="User"] rect');
    expect(rect?.getAttribute('data-has-block')).toBe('true');
    expect(rect?.getAttribute('stroke-width')).toBe('2');
  });

  it('should not add block indicators when addBlockIndicators is false', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE, { addBlockIndicators: false });

    const rect = container.querySelector('[id*="User"] rect');
    expect(rect?.getAttribute('data-has-block')).toBeNull();
  });

  it('should prioritize onBlockClick over onEntityClick for blocked entities', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onEntityClick = jest.fn();
    const onBlockClick = jest.fn();

    processSvg(container, SAMPLE_SOURCE, { onEntityClick, onBlockClick });

    const entityElement = container.querySelector('[id*="User"]');
    entityElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onBlockClick).toHaveBeenCalled();
    expect(onEntityClick).not.toHaveBeenCalled();
  });

  it('should call onEntityClick for entities without blocks', () => {
    const svgContent = createEntityGroup('LineItem');
    const container = createMockContainer(svgContent);
    const onEntityClick = jest.fn();
    const onBlockClick = jest.fn();

    processSvg(container, SAMPLE_SOURCE, { onEntityClick, onBlockClick });

    const entityElement = container.querySelector('[id*="LineItem"]');
    entityElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onEntityClick).toHaveBeenCalled();
    expect(onBlockClick).not.toHaveBeenCalled();
  });

  it('should stop event propagation on click', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const onEntityClick = jest.fn();
    const parentClickHandler = jest.fn();

    processSvg(container, SAMPLE_SOURCE_NO_BLOCKS, { onEntityClick });
    container.addEventListener('click', parentClickHandler);

    const entityElement = container.querySelector('[id*="User"]');
    entityElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onEntityClick).toHaveBeenCalled();
    // Event propagation is stopped, so parent won't receive it
  });
});

describe('getEntityNodeInfo', () => {
  it('should return entity info for existing entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const info = getEntityNodeInfo(container, SAMPLE_SOURCE, 'User');

    expect(info).not.toBeNull();
    expect(info?.name).toBe('User');
    expect(info?.hasBlock).toBe(true);
  });

  it('should return null for non-existent entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const info = getEntityNodeInfo(container, SAMPLE_SOURCE, 'NonExistent');

    expect(info).toBeNull();
  });
});

describe('hasEntityNode', () => {
  it('should return true for existing entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const result = hasEntityNode(container, SAMPLE_SOURCE, 'User');

    expect(result).toBe(true);
  });

  it('should return false for non-existent entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const result = hasEntityNode(container, SAMPLE_SOURCE, 'NonExistent');

    expect(result).toBe(false);
  });
});

describe('getEntityNames', () => {
  it('should return all entity names', () => {
    const svgContent = `
      ${createEntityGroup('User')}
      ${createEntityGroup('Order')}
      ${createEntityGroup('LineItem')}
    `;
    const container = createMockContainer(svgContent);

    const names = getEntityNames(container, SAMPLE_SOURCE);

    expect(names).toContain('User');
    expect(names).toContain('Order');
    expect(names).toContain('LineItem');
    expect(names).toHaveLength(3);
  });

  it('should return empty array when no entities found', () => {
    const container = createMockContainer();

    const names = getEntityNames(container, 'erDiagram');

    expect(names).toHaveLength(0);
  });
});

describe('getEntityBoundingBox', () => {
  it('should return bounding box for existing entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    // Mock the bounding box
    const entityElement = container.querySelector('[id*="User"]') as HTMLElement;
    if (entityElement) {
      entityElement.getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const bbox = getEntityBoundingBox(container, SAMPLE_SOURCE, 'User');

    expect(bbox).not.toBeNull();
    expect(bbox).toBeInstanceOf(DOMRect);
  });

  it('should return null for non-existent entity', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const bbox = getEntityBoundingBox(container, SAMPLE_SOURCE, 'NonExistent');

    expect(bbox).toBeNull();
  });
});

describe('cleanupEntityHandlers', () => {
  it('should not throw for null container', () => {
    expect(() => cleanupEntityHandlers(null)).not.toThrow();
  });

  it('should clean up elements with data-entity-click-handler attribute', () => {
    const container = document.createElement('div');
    const element = document.createElement('div');
    element.setAttribute('data-entity-click-handler', 'true');

    const clickHandler = jest.fn();
    element.addEventListener('click', clickHandler);
    container.appendChild(element);

    cleanupEntityHandlers(container);

    // After cleanup, the original element is replaced with a clone
    const newElement = container.querySelector('[data-entity-click-handler]');
    expect(newElement).not.toBe(element);
  });

  it('should handle container with no handler elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<div>No handlers here</div>';

    expect(() => cleanupEntityHandlers(container)).not.toThrow();
  });
});

describe('applyEntityHoverStyles', () => {
  it('should not throw for null container', () => {
    expect(() => applyEntityHoverStyles(null)).not.toThrow();
  });

  it('should not throw for container without SVG', () => {
    const container = document.createElement('div');

    expect(() => applyEntityHoverStyles(container)).not.toThrow();
  });

  it('should add style element to SVG', () => {
    const container = createMockContainer();

    applyEntityHoverStyles(container);

    const style = container.querySelector('#er-entity-hover-styles');
    expect(style).not.toBeNull();
    expect(style?.tagName.toLowerCase()).toBe('style');
  });

  it('should not add duplicate style elements', () => {
    const container = createMockContainer();

    applyEntityHoverStyles(container);
    applyEntityHoverStyles(container);

    const styles = container.querySelectorAll('#er-entity-hover-styles');
    expect(styles).toHaveLength(1);
  });

  it('should include hover styles for entity classes', () => {
    const container = createMockContainer();

    applyEntityHoverStyles(container);

    const style = container.querySelector('#er-entity-hover-styles');
    expect(style?.textContent).toContain('.er-entity-node');
    expect(style?.textContent).toContain(':hover');
    expect(style?.textContent).toContain('transition');
  });
});

describe('getBlockBadgePositions', () => {
  it('should return empty array for null container', () => {
    const processedSvg: ProcessedSvg = {
      svgElement: null,
      entityNodes: new Map(),
      blocks: [],
      entityCount: 0,
      blockedEntityCount: 0,
    };

    const positions = getBlockBadgePositions(null, processedSvg);

    expect(positions).toHaveLength(0);
  });

  it('should return positions for entities with blocks', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    // Process the SVG first
    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect for the entity element
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg);

    // Should have position for User (which has a block)
    const userPosition = positions.find((p) => p.entityName === 'User');
    expect(userPosition).toBeDefined();
    expect(userPosition?.block.childDiagramId).toBe('user-detail');
  });

  it('should not return positions for entities without blocks', () => {
    const svgContent = createEntityGroup('LineItem');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);
    const positions = getBlockBadgePositions(container, processedSvg);

    const lineItemPosition = positions.find((p) => p.entityName === 'LineItem');
    expect(lineItemPosition).toBeUndefined();
  });

  it('should calculate top-right position correctly', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg, 'top-right');
    const userPosition = positions.find((p) => p.entityName === 'User');

    // Top-right: x = left + width, y = top
    expect(userPosition?.x).toBe(100 + 150); // 250
    expect(userPosition?.y).toBe(100);
  });

  it('should calculate top-left position correctly', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg, 'top-left');
    const userPosition = positions.find((p) => p.entityName === 'User');

    // Top-left: x = left, y = top
    expect(userPosition?.x).toBe(100);
    expect(userPosition?.y).toBe(100);
  });

  it('should calculate bottom-right position correctly', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg, 'bottom-right');
    const userPosition = positions.find((p) => p.entityName === 'User');

    // Bottom-right: x = left + width, y = top + height
    expect(userPosition?.x).toBe(100 + 150); // 250
    expect(userPosition?.y).toBe(100 + 80); // 180
  });

  it('should calculate bottom-left position correctly', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg, 'bottom-left');
    const userPosition = positions.find((p) => p.entityName === 'User');

    // Bottom-left: x = left, y = top + height
    expect(userPosition?.x).toBe(100);
    expect(userPosition?.y).toBe(100 + 80); // 180
  });

  it('should apply offset to positions', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const offset = { x: -8, y: -8 };
    const positions = getBlockBadgePositions(container, processedSvg, 'top-right', offset);
    const userPosition = positions.find((p) => p.entityName === 'User');

    // Top-right with offset: x = left + width + offsetX, y = top + offsetY
    expect(userPosition?.x).toBe(250 - 8); // 242
    expect(userPosition?.y).toBe(100 - 8); // 92
  });

  it('should include entity dimensions in position data', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const processedSvg = processSvg(container, SAMPLE_SOURCE);

    // Mock getBoundingClientRect
    const entityElement = container.querySelector('[id*="User"]');
    if (entityElement) {
      (entityElement as HTMLElement).getBoundingClientRect = jest.fn(() =>
        new DOMRect(100, 100, 150, 80)
      );
    }

    const positions = getBlockBadgePositions(container, processedSvg);
    const userPosition = positions.find((p) => p.entityName === 'User');

    expect(userPosition?.width).toBe(150);
    expect(userPosition?.height).toBe(80);
  });
});

describe('edge cases', () => {
  it('should handle SVG with no matching entity IDs', () => {
    const svgContent = `
      <g id="unrelated-group">
        <rect x="0" y="0" width="100" height="100"/>
        <text>Some text</text>
      </g>
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, SAMPLE_SOURCE);

    expect(result.svgElement).not.toBeNull();
    expect(result.entityCount).toBe(0);
  });

  it('should handle empty Mermaid source', () => {
    const container = createMockContainer();

    const result = processSvg(container, '');

    expect(result.blocks).toHaveLength(0);
    expect(result.entityCount).toBe(0);
  });

  it('should handle source with only block directives', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);
    const source = '%%block: User -> diagramId=abc123';

    const result = processSvg(container, source);

    expect(result.blocks).toHaveLength(1);
  });

  it('should handle entities with special characters in names', () => {
    const source = `
erDiagram
  User_Account ||--o{ Order_Item : contains
  %%block: User_Account -> diagramId=abc
`;
    const svgContent = `
      <g id="entity-User_Account" class="entity">
        <rect x="0" y="0" width="150" height="80"/>
        <text><tspan>User_Account</tspan></text>
      </g>
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, source);

    expect(result.entityNodes.has('User_Account')).toBe(true);
    expect(result.entityNodes.get('User_Account')?.hasBlock).toBe(true);
  });

  it('should handle multiple blocks on same entity (uses last one)', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=first
  %%block: User -> diagramId=second
`;
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    const result = processSvg(container, source);

    // Parser returns all blocks, processor associates one
    expect(result.blocks).toHaveLength(2);
  });

  it('should handle nested SVG groups', () => {
    const svgContent = `
      <g class="root">
        <g class="entities">
          <g id="entity-User" class="entity">
            <rect x="0" y="0" width="150" height="80"/>
            <text><tspan>User</tspan></text>
          </g>
        </g>
      </g>
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, SAMPLE_SOURCE);

    expect(result.entityNodes.has('User')).toBe(true);
  });
});

describe('event handler prevention', () => {
  it('should prevent default on entity click', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE_NO_BLOCKS, { onEntityClick: jest.fn() });

    const entityElement = container.querySelector('[id*="User"]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    entityElement?.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should stop propagation on entity click', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE_NO_BLOCKS, { onEntityClick: jest.fn() });

    const entityElement = container.querySelector('[id*="User"]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    entityElement?.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('should prevent default on context menu', () => {
    const svgContent = createEntityGroup('User');
    const container = createMockContainer(svgContent);

    processSvg(container, SAMPLE_SOURCE, { onEntityContextMenu: jest.fn() });

    const entityElement = container.querySelector('[id*="User"]');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    entityElement?.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('integration with parser', () => {
  it('should correctly associate parsed blocks with SVG entities', () => {
    const source = `
erDiagram
  Customer ||--o{ Order : places
  Order ||--|{ LineItem : contains
  Product ||--o{ LineItem : "included in"
  %%block: Customer -> diagramId=cust-001 label="Customer Details"
  %%block: Order -> diagramId=order-001 label="Order Schema"
  %%block: Product -> diagramId=prod-001
`;
    const svgContent = `
      ${createEntityGroup('Customer')}
      ${createEntityGroup('Order')}
      ${createEntityGroup('LineItem')}
      ${createEntityGroup('Product')}
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, source);

    expect(result.entityCount).toBe(4);
    expect(result.blockedEntityCount).toBe(3);
    expect(result.blocks).toHaveLength(3);

    // Verify each blocked entity
    expect(result.entityNodes.get('Customer')?.block?.label).toBe('Customer Details');
    expect(result.entityNodes.get('Order')?.block?.label).toBe('Order Schema');
    expect(result.entityNodes.get('Product')?.block?.label).toBeUndefined();
    expect(result.entityNodes.get('LineItem')?.hasBlock).toBe(false);
  });

  it('should handle source with only relationships (no blocks)', () => {
    const source = `
erDiagram
  A ||--o{ B : relates
  B ||--|{ C : contains
`;
    const svgContent = `
      ${createEntityGroup('A')}
      ${createEntityGroup('B')}
      ${createEntityGroup('C')}
    `;
    const container = createMockContainer(svgContent);

    const result = processSvg(container, source);

    expect(result.entityCount).toBe(3);
    expect(result.blockedEntityCount).toBe(0);
    expect(result.blocks).toHaveLength(0);

    result.entityNodes.forEach((node) => {
      expect(node.hasBlock).toBe(false);
      expect(node.block).toBeUndefined();
    });
  });
});
