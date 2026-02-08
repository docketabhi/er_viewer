/**
 * Tests for the block directive parser.
 *
 * @module lib/mermaid/__tests__/parser.test
 */

import {
  parseBlockDirectives,
  parseMermaidSource,
  extractEntities,
  validateBlockDirectives,
  isBlockDirective,
  createBlockDirective,
  findBlockForEntity,
  countBlockDirectives,
} from '../parser';

describe('parseBlockDirectives', () => {
  it('should parse a single block directive', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      entityKey: 'User',
      childDiagramId: 'abc123',
      label: undefined,
    });
  });

  it('should parse block directive with label', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123 label="User Details"
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      entityKey: 'User',
      childDiagramId: 'abc123',
      label: 'User Details',
    });
  });

  it('should parse multiple block directives', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  Order ||--|{ LineItem : contains
  %%block: User -> diagramId=user-detail label="User Schema"
  %%block: Order -> diagramId=order-detail label="Order Schema"
  %%block: LineItem -> diagramId=lineitem-detail
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].entityKey).toBe('User');
    expect(blocks[1].entityKey).toBe('Order');
    expect(blocks[2].entityKey).toBe('LineItem');
    expect(blocks[2].label).toBeUndefined();
  });

  it('should handle UUID-style diagram IDs', () => {
    const source = `%%block: Entity -> diagramId=550e8400-e29b-41d4-a716-446655440000`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].childDiagramId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should return empty array for source without directives', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(0);
  });

  it('should handle entity names with underscores', () => {
    const source = `%%block: User_Account -> diagramId=abc123`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].entityKey).toBe('User_Account');
  });

  it('should handle labels with spaces and special characters', () => {
    const source = `%%block: User -> diagramId=abc label="User Details & Info"`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].label).toBe('User Details & Info');
  });

  it('should handle directives with varying whitespace', () => {
    const sources = [
      '%%block:User->diagramId=abc',
      '%%block: User -> diagramId=abc',
      '%%block:  User  ->  diagramId=abc',
      '  %%block: User -> diagramId=abc',
    ];

    for (const source of sources) {
      const blocks = parseBlockDirectives(source);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].entityKey).toBe('User');
    }
  });

  it('should not match regular comments', () => {
    const source = `
erDiagram
  %% This is a regular comment
  User ||--o{ Order : places
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(0);
  });
});

describe('parseMermaidSource', () => {
  it('should return parse result with blocks and cleaned source', () => {
    const source = `erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123`;

    const result = parseMermaidSource(source);

    expect(result.blocks).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.cleanedSource).not.toContain('%%block:');
    expect(result.cleanedSource).toContain('User ||--o{ Order');
  });

  it('should collect errors for malformed directives', () => {
    const source = `erDiagram
  %%block: User ->
  %%block: -> diagramId=abc
  %%block: InvalidDirective`;

    const result = parseMermaidSource(source, { collectErrors: true });

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should preserve directives when stripDirectives is false', () => {
    const source = `erDiagram
  %%block: User -> diagramId=abc123`;

    const result = parseMermaidSource(source, { stripDirectives: false });

    expect(result.cleanedSource).toContain('%%block:');
  });

  it('should handle empty source', () => {
    const result = parseMermaidSource('');

    expect(result.blocks).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.cleanedSource).toBe('');
  });

  it('should preserve line structure in cleaned source', () => {
    const source = `erDiagram
  User {
    int id
  }
  %%block: User -> diagramId=abc123
  Order {
    int id
  }`;

    const result = parseMermaidSource(source);

    // Verify that the structure is preserved (minus the block directive line)
    expect(result.cleanedSource).toContain('User {');
    expect(result.cleanedSource).toContain('Order {');
    expect(result.cleanedSource).not.toContain('%%block:');
  });
});

describe('extractEntities', () => {
  it('should extract entities from relationships', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  Order ||--|{ LineItem : contains
`;

    const entities = extractEntities(source);

    expect(entities.has('User')).toBe(true);
    expect(entities.has('Order')).toBe(true);
    expect(entities.has('LineItem')).toBe(true);
  });

  it('should extract entities from attribute blocks', () => {
    const source = `
erDiagram
  User {
    int id
    string name
  }
`;

    const entities = extractEntities(source);

    expect(entities.has('User')).toBe(true);
    expect(entities.get('User')?.name).toBe('User');
  });

  it('should associate blocks with entities', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123 label="Details"
`;

    const entities = extractEntities(source);

    expect(entities.get('User')?.hasBlock).toBe(true);
    expect(entities.get('User')?.block?.childDiagramId).toBe('abc123');
    expect(entities.get('Order')?.hasBlock).toBe(false);
  });

  it('should return empty map for empty source', () => {
    const entities = extractEntities('');

    expect(entities.size).toBe(0);
  });

  it('should handle mixed entity definitions', () => {
    const source = `
erDiagram
  User {
    int id
  }
  User ||--o{ Order : places
  Product ||--o{ LineItem : contains
  LineItem {
    int quantity
  }
`;

    const entities = extractEntities(source);

    // Should not have duplicates
    expect(entities.size).toBe(4);
    expect(entities.has('User')).toBe(true);
    expect(entities.has('Order')).toBe(true);
    expect(entities.has('Product')).toBe(true);
    expect(entities.has('LineItem')).toBe(true);
  });
});

describe('validateBlockDirectives', () => {
  it('should return no errors for valid directives', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123
`;

    const errors = validateBlockDirectives(source);

    expect(errors).toHaveLength(0);
  });

  it('should return error for directive referencing unknown entity', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: UnknownEntity -> diagramId=abc123
`;

    const errors = validateBlockDirectives(source);

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('UnknownEntity');
  });

  it('should return multiple errors for multiple invalid directives', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: Foo -> diagramId=abc123
  %%block: Bar -> diagramId=def456
`;

    const errors = validateBlockDirectives(source);

    expect(errors).toHaveLength(2);
  });
});

describe('isBlockDirective', () => {
  it('should return true for valid directives', () => {
    expect(isBlockDirective('%%block: User -> diagramId=abc')).toBe(true);
    expect(isBlockDirective('%%block: User -> diagramId=abc label="Test"')).toBe(true);
  });

  it('should return false for invalid directives', () => {
    expect(isBlockDirective('%% regular comment')).toBe(false);
    expect(isBlockDirective('%%block: User')).toBe(false);
    expect(isBlockDirective('not a directive')).toBe(false);
  });
});

describe('createBlockDirective', () => {
  it('should create directive without label', () => {
    const directive = createBlockDirective('User', 'abc123');

    expect(directive).toBe('%%block: User -> diagramId=abc123');
  });

  it('should create directive with label', () => {
    const directive = createBlockDirective('User', 'abc123', 'User Details');

    expect(directive).toBe('%%block: User -> diagramId=abc123 label="User Details"');
  });

  it('should handle UUID-style IDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const directive = createBlockDirective('Entity', uuid);

    expect(directive).toBe(`%%block: Entity -> diagramId=${uuid}`);
  });
});

describe('findBlockForEntity', () => {
  it('should find block for existing entity', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123 label="Details"
  %%block: Order -> diagramId=def456
`;

    const block = findBlockForEntity(source, 'User');

    expect(block).toBeDefined();
    expect(block?.childDiagramId).toBe('abc123');
    expect(block?.label).toBe('Details');
  });

  it('should return undefined for entity without block', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc123
`;

    const block = findBlockForEntity(source, 'Order');

    expect(block).toBeUndefined();
  });

  it('should return undefined for non-existent entity', () => {
    const source = `
erDiagram
  User ||--o{ Order : places
`;

    const block = findBlockForEntity(source, 'NonExistent');

    expect(block).toBeUndefined();
  });
});

describe('countBlockDirectives', () => {
  it('should count zero for no directives', () => {
    const source = `erDiagram
  User ||--o{ Order : places`;

    expect(countBlockDirectives(source)).toBe(0);
  });

  it('should count multiple directives', () => {
    const source = `
erDiagram
  %%block: A -> diagramId=1
  %%block: B -> diagramId=2
  %%block: C -> diagramId=3
`;

    expect(countBlockDirectives(source)).toBe(3);
  });
});

describe('edge cases', () => {
  it('should handle Windows line endings (CRLF)', () => {
    const source = 'erDiagram\r\n  User ||--o{ Order : places\r\n  %%block: User -> diagramId=abc123\r\n';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].entityKey).toBe('User');
  });

  it('should handle mixed line endings', () => {
    const source = 'erDiagram\n  User ||--o{ Order\r\n  %%block: User -> diagramId=abc\n';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
  });

  it('should handle directives at the very beginning', () => {
    const source = '%%block: User -> diagramId=abc';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
  });

  it('should handle directives at the very end without newline', () => {
    const source = 'erDiagram\n%%block: User -> diagramId=abc';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
  });

  it('should handle empty label', () => {
    const source = '%%block: User -> diagramId=abc label=""';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].label).toBe('');
  });

  it('should handle very long diagram IDs', () => {
    const longId = 'a'.repeat(100);
    const source = `%%block: User -> diagramId=${longId}`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].childDiagramId).toBe(longId);
  });

  it('should handle entity names starting with underscore', () => {
    const source = '%%block: _PrivateEntity -> diagramId=abc';

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].entityKey).toBe('_PrivateEntity');
  });

  it('should not match partial directive patterns', () => {
    const source = `
erDiagram
  %%blockUser -> diagramId=abc
  %%block User -> diagramId=abc
  % %block: User -> diagramId=abc
`;

    const blocks = parseBlockDirectives(source);

    expect(blocks).toHaveLength(0);
  });
});

describe('malformed directive error messages', () => {
  it('should report missing arrow error', () => {
    const source = `erDiagram
  %%block: User diagramId=abc`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('->');
  });

  it('should report missing diagramId parameter error', () => {
    const source = `erDiagram
  %%block: User -> abc`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('diagramId=');
  });

  it('should report missing entity name error', () => {
    const source = `erDiagram
  %%block: -> diagramId=abc`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('entity');
  });

  it('should report empty diagramId error', () => {
    const source = `erDiagram
  %%block: User -> diagramId=`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should report invalid entity name start character error', () => {
    const source = `erDiagram
  %%block: 123User -> diagramId=abc`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('letter');
  });

  it('should report unclosed label quotation error', () => {
    const source = `erDiagram
  %%block: User -> diagramId=abc label="unclosed`;

    const result = parseMermaidSource(source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('quotation');
  });
});

describe('entity extraction advanced cases', () => {
  it('should extract entities from all ER relationship types', () => {
    const source = `
erDiagram
  User ||--|| Profile : has
  User ||--o{ Order : places
  Order }|--|{ Product : contains
  Product ||--o| Category : "belongs to"
`;

    const entities = extractEntities(source);

    expect(entities.has('User')).toBe(true);
    expect(entities.has('Profile')).toBe(true);
    expect(entities.has('Order')).toBe(true);
    expect(entities.has('Product')).toBe(true);
    expect(entities.has('Category')).toBe(true);
  });

  it('should track first occurrence line number', () => {
    const source = `erDiagram
  User ||--o{ Order : places
  Order {
    int id
  }`;

    const entities = extractEntities(source);

    // User appears on line 2
    expect(entities.get('User')?.line).toBe(2);
    // Order appears first in relationship on line 2, not in block definition on line 3
    expect(entities.get('Order')?.line).toBe(2);
  });

  it('should handle entities with numbers in name', () => {
    const source = `
erDiagram
  User2 ||--o{ Order99 : places
  %%block: User2 -> diagramId=abc
`;

    const entities = extractEntities(source);

    expect(entities.has('User2')).toBe(true);
    expect(entities.has('Order99')).toBe(true);
    expect(entities.get('User2')?.hasBlock).toBe(true);
  });

  it('should handle complex nested attribute blocks', () => {
    const source = `
erDiagram
  User {
    int id PK
    string email UK
    string name
    datetime createdAt
  }
  Profile {
    int id PK
    int userId FK
    string bio
  }
`;

    const entities = extractEntities(source);

    expect(entities.size).toBe(2);
    expect(entities.has('User')).toBe(true);
    expect(entities.has('Profile')).toBe(true);
  });
});

describe('round-trip consistency', () => {
  it('should create directive that can be parsed back', () => {
    const entityKey = 'TestEntity';
    const diagramId = 'test-123-uuid';
    const label = 'Test Label';

    const directive = createBlockDirective(entityKey, diagramId, label);
    const blocks = parseBlockDirectives(directive);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].entityKey).toBe(entityKey);
    expect(blocks[0].childDiagramId).toBe(diagramId);
    expect(blocks[0].label).toBe(label);
  });

  it('should create and find directive for entity', () => {
    const source = `erDiagram
  User ||--o{ Order : places`;

    const directive = createBlockDirective('User', 'child-123', 'Child Details');
    const fullSource = `${source}\n  ${directive}`;

    const block = findBlockForEntity(fullSource, 'User');

    expect(block).toBeDefined();
    expect(block?.childDiagramId).toBe('child-123');
    expect(block?.label).toBe('Child Details');
  });

  it('should validate directives match entities correctly', () => {
    const source = `erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc
  %%block: Order -> diagramId=def`;

    const errors = validateBlockDirectives(source);

    expect(errors).toHaveLength(0);
  });

  it('should count only valid directives', () => {
    const source = `erDiagram
  User ||--o{ Order : places
  %%block: User -> diagramId=abc
  %%block: InvalidSyntax
  %%block: Order -> diagramId=def`;

    // countBlockDirectives only counts valid directives
    const count = countBlockDirectives(source);

    expect(count).toBe(2);
  });
});
