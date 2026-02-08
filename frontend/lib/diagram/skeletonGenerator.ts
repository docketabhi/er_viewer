/**
 * Skeleton diagram generator for creating child ER diagrams.
 *
 * Generates pre-populated Mermaid ERD code based on a parent entity,
 * providing a starting point for nested diagram creation.
 *
 * @module lib/diagram/skeletonGenerator
 */

/**
 * Configuration options for skeleton generation.
 */
export interface SkeletonGeneratorOptions {
  /**
   * Whether to include sample attributes in entities.
   * @default true
   */
  includeAttributes?: boolean;

  /**
   * Whether to include sample relationships.
   * @default true
   */
  includeRelationships?: boolean;

  /**
   * Number of related entities to generate.
   * @default 3
   */
  relatedEntityCount?: number;

  /**
   * Whether to add helpful comments in the generated code.
   * @default true
   */
  includeComments?: boolean;

  /**
   * Naming style for generated entities.
   * - 'suffix': Uses suffixes like _DETAILS, _SETTINGS (e.g., USER_DETAILS)
   * - 'prefix': Uses prefixes like DETAIL_, SETTING_ (e.g., DETAIL_USER)
   * - 'descriptive': Uses descriptive names based on common patterns
   * @default 'suffix'
   */
  namingStyle?: 'suffix' | 'prefix' | 'descriptive';

  /**
   * Custom suffix/prefix patterns for related entities.
   * If not provided, uses defaults based on naming style.
   */
  customPatterns?: string[];

  /**
   * Whether to include a reference back to the parent entity.
   * @default true
   */
  includeParentReference?: boolean;
}

/**
 * Result of skeleton generation.
 */
export interface SkeletonResult {
  /**
   * The generated Mermaid ERD source code.
   */
  source: string;

  /**
   * The main entity name in the child diagram.
   */
  mainEntityName: string;

  /**
   * Names of all generated entities.
   */
  entityNames: string[];

  /**
   * Suggested title for the child diagram.
   */
  suggestedTitle: string;
}

/**
 * Default options for skeleton generation.
 */
const DEFAULT_OPTIONS: Required<SkeletonGeneratorOptions> = {
  includeAttributes: true,
  includeRelationships: true,
  relatedEntityCount: 3,
  includeComments: true,
  namingStyle: 'suffix',
  customPatterns: [],
  includeParentReference: true,
};

/**
 * Default suffix patterns for related entities.
 */
const DEFAULT_SUFFIX_PATTERNS = [
  '_DETAILS',
  '_SETTINGS',
  '_HISTORY',
  '_METADATA',
  '_PREFERENCES',
  '_AUDIT',
  '_LOGS',
  '_CONFIG',
];

/**
 * Default prefix patterns for related entities.
 */
const DEFAULT_PREFIX_PATTERNS = [
  'DETAIL_',
  'SETTING_',
  'HISTORY_',
  'META_',
  'PREF_',
  'AUDIT_',
  'LOG_',
  'CONFIG_',
];

/**
 * Descriptive entity patterns based on common database patterns.
 */
const DESCRIPTIVE_PATTERNS: Record<string, string[]> = {
  USER: ['PROFILE', 'ACCOUNT_SETTINGS', 'LOGIN_HISTORY', 'USER_PREFERENCES'],
  CUSTOMER: ['CUSTOMER_PROFILE', 'BILLING_INFO', 'CONTACT_DETAILS', 'CUSTOMER_NOTES'],
  ORDER: ['ORDER_ITEMS', 'ORDER_STATUS', 'SHIPPING_DETAILS', 'PAYMENT_INFO'],
  PRODUCT: ['PRODUCT_DETAILS', 'INVENTORY', 'PRICING_HISTORY', 'PRODUCT_IMAGES'],
  ACCOUNT: ['ACCOUNT_DETAILS', 'PERMISSIONS', 'ACTIVITY_LOG', 'BILLING_HISTORY'],
  EMPLOYEE: ['EMPLOYEE_DETAILS', 'EMPLOYMENT_HISTORY', 'PAYROLL_INFO', 'PERFORMANCE_REVIEWS'],
  INVOICE: ['INVOICE_ITEMS', 'PAYMENT_RECORDS', 'TAX_DETAILS', 'INVOICE_NOTES'],
  PROJECT: ['PROJECT_DETAILS', 'MILESTONES', 'TEAM_MEMBERS', 'PROJECT_FILES'],
  DEFAULT: ['MAIN_DETAILS', 'RELATED_SETTINGS', 'CHANGE_HISTORY', 'ADDITIONAL_INFO'],
};

/**
 * Common attribute patterns for different entity types.
 */
const ATTRIBUTE_PATTERNS: Record<string, { type: string; name: string }[]> = {
  DETAILS: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'description' },
    { type: 'datetime', name: 'createdAt' },
    { type: 'datetime', name: 'updatedAt' },
  ],
  SETTINGS: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'key' },
    { type: 'string', name: 'value' },
    { type: 'boolean', name: 'isActive' },
  ],
  HISTORY: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'action' },
    { type: 'string', name: 'details' },
    { type: 'datetime', name: 'timestamp' },
    { type: 'string', name: 'performedBy' },
  ],
  METADATA: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'metaKey' },
    { type: 'string', name: 'metaValue' },
    { type: 'string', name: 'dataType' },
  ],
  PREFERENCES: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'category' },
    { type: 'string', name: 'preference' },
    { type: 'string', name: 'value' },
  ],
  DEFAULT: [
    { type: 'int', name: 'id PK' },
    { type: 'string', name: 'name' },
    { type: 'string', name: 'value' },
    { type: 'datetime', name: 'createdAt' },
  ],
};

/**
 * Relationship types for ER diagrams.
 */
const RELATIONSHIP_TYPES = [
  '||--||', // one-to-one
  '||--o{', // one-to-many (main)
  '}o--||', // many-to-one
  '||--|{', // one-to-many (required)
] as const;

/**
 * Formats an entity name to a consistent case (UPPER_CASE).
 *
 * @param name - The entity name to format
 * @returns Formatted entity name
 */
function formatEntityName(name: string): string {
  // Remove any existing underscores and convert to upper case
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase to UPPER_CASE
    .replace(/[-\s]+/g, '_') // dashes/spaces to underscores
    .toUpperCase();
}

/**
 * Converts an entity name to a human-readable title.
 *
 * @param name - The entity name
 * @returns Human-readable title
 */
function entityNameToTitle(name: string): string {
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generates related entity names based on options.
 *
 * @param parentName - The parent entity name
 * @param count - Number of entities to generate
 * @param options - Generator options
 * @returns Array of related entity names
 */
function generateRelatedEntityNames(
  parentName: string,
  count: number,
  options: Required<SkeletonGeneratorOptions>
): string[] {
  const formattedParent = formatEntityName(parentName);
  const patterns = options.customPatterns.length > 0
    ? options.customPatterns
    : getDefaultPatterns(formattedParent, options.namingStyle);

  return patterns.slice(0, count).map((pattern) => {
    switch (options.namingStyle) {
      case 'suffix':
        return `${formattedParent}${pattern}`;
      case 'prefix':
        return `${pattern}${formattedParent}`;
      case 'descriptive':
        return pattern;
      default:
        return `${formattedParent}${pattern}`;
    }
  });
}

/**
 * Gets default patterns based on naming style and parent entity.
 *
 * @param parentName - The parent entity name
 * @param style - The naming style
 * @returns Array of patterns
 */
function getDefaultPatterns(
  parentName: string,
  style: 'suffix' | 'prefix' | 'descriptive'
): string[] {
  if (style === 'descriptive') {
    // Try to find a matching descriptive pattern
    for (const [key, patterns] of Object.entries(DESCRIPTIVE_PATTERNS)) {
      if (parentName.includes(key)) {
        return patterns;
      }
    }
    return DESCRIPTIVE_PATTERNS.DEFAULT;
  }

  return style === 'prefix' ? DEFAULT_PREFIX_PATTERNS : DEFAULT_SUFFIX_PATTERNS;
}

/**
 * Gets appropriate attributes for an entity based on its name.
 *
 * @param entityName - The entity name
 * @returns Array of attributes
 */
function getAttributesForEntity(
  entityName: string
): { type: string; name: string }[] {
  // Try to match entity name suffix to attribute patterns
  for (const [suffix, attributes] of Object.entries(ATTRIBUTE_PATTERNS)) {
    if (entityName.toUpperCase().includes(suffix)) {
      return attributes;
    }
  }
  return ATTRIBUTE_PATTERNS.DEFAULT;
}

/**
 * Generates attributes block for an entity.
 *
 * @param entityName - The entity name
 * @param indent - Indentation string
 * @returns Formatted attributes block
 */
function generateAttributesBlock(entityName: string, indent: string): string {
  const attributes = getAttributesForEntity(entityName);
  return attributes
    .map((attr) => `${indent}    ${attr.type} ${attr.name}`)
    .join('\n');
}

/**
 * Generates a skeleton ER diagram for a child diagram.
 *
 * @param parentEntityName - The name of the entity from the parent diagram
 * @param options - Configuration options
 * @returns The generated skeleton result
 *
 * @example
 * ```typescript
 * const result = generateSkeletonDiagram('CUSTOMER', {
 *   relatedEntityCount: 3,
 *   includeAttributes: true,
 * });
 *
 * console.log(result.source);
 * // erDiagram
 * //     CUSTOMER_DETAILS ||--o{ CUSTOMER_SETTINGS : has
 * //     CUSTOMER_DETAILS ||--|{ CUSTOMER_HISTORY : tracks
 * //     ...
 * ```
 */
export function generateSkeletonDiagram(
  parentEntityName: string,
  options: SkeletonGeneratorOptions = {}
): SkeletonResult {
  const opts: Required<SkeletonGeneratorOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const formattedParent = formatEntityName(parentEntityName);
  const mainEntityName = `${formattedParent}_DETAILS`;
  const relatedNames = generateRelatedEntityNames(
    parentEntityName,
    opts.relatedEntityCount,
    opts
  );

  // Filter out the main entity name if it appears in related names
  const otherEntities = relatedNames.filter((name) => name !== mainEntityName);
  const allEntities = [mainEntityName, ...otherEntities];

  const lines: string[] = [];

  // Add header comment
  if (opts.includeComments) {
    lines.push(`%% Child diagram for ${entityNameToTitle(parentEntityName)}`);
    lines.push(`%% Auto-generated skeleton - customize as needed`);
    lines.push('');
  }

  // Start erDiagram
  lines.push('erDiagram');

  // Add parent reference comment
  if (opts.includeParentReference && opts.includeComments) {
    lines.push(`    %% Reference to parent entity: ${formattedParent}`);
    lines.push('');
  }

  // Add relationships
  if (opts.includeRelationships && otherEntities.length > 0) {
    const relationshipTypes = [...RELATIONSHIP_TYPES];

    otherEntities.forEach((entityName, index) => {
      const relType = relationshipTypes[index % relationshipTypes.length];
      const relationshipLabel = getRelationshipLabel(entityName);
      lines.push(`    ${mainEntityName} ${relType} ${entityName} : ${relationshipLabel}`);
    });

    lines.push('');
  }

  // Add entity definitions with attributes
  if (opts.includeAttributes) {
    // Main entity
    lines.push(`    ${mainEntityName} {`);
    lines.push(generateAttributesBlock(mainEntityName, ''));
    if (opts.includeParentReference) {
      lines.push(`        int ${formattedParent.toLowerCase()}Id FK "Reference to parent"`);
    }
    lines.push('    }');

    // Related entities
    for (const entityName of otherEntities) {
      lines.push(`    ${entityName} {`);
      lines.push(generateAttributesBlock(entityName, ''));
      lines.push('    }');
    }
  }

  // Add placeholder comment for additional entities
  if (opts.includeComments) {
    lines.push('');
    lines.push('    %% Add your entities and relationships below');
    lines.push('    %% Example: ENTITY_NAME { type attributeName }');
  }

  return {
    source: lines.join('\n'),
    mainEntityName,
    entityNames: allEntities,
    suggestedTitle: `${entityNameToTitle(parentEntityName)} Details`,
  };
}

/**
 * Gets a relationship label based on entity name.
 *
 * @param entityName - The entity name
 * @returns Relationship label
 */
function getRelationshipLabel(entityName: string): string {
  const upperName = entityName.toUpperCase();

  if (upperName.includes('SETTINGS') || upperName.includes('CONFIG')) {
    return 'configures';
  }
  if (upperName.includes('HISTORY') || upperName.includes('LOG') || upperName.includes('AUDIT')) {
    return 'tracks';
  }
  if (upperName.includes('METADATA') || upperName.includes('META')) {
    return 'describes';
  }
  if (upperName.includes('PREFERENCES') || upperName.includes('PREF')) {
    return 'prefers';
  }
  if (upperName.includes('DETAILS') || upperName.includes('INFO')) {
    return 'contains';
  }

  return 'has';
}

/**
 * Generates a minimal skeleton with just the basic structure.
 *
 * @param parentEntityName - The name of the parent entity
 * @returns Minimal skeleton result
 *
 * @example
 * ```typescript
 * const result = generateMinimalSkeleton('USER');
 * // Creates a simple diagram with USER_DETAILS and basic attributes
 * ```
 */
export function generateMinimalSkeleton(parentEntityName: string): SkeletonResult {
  return generateSkeletonDiagram(parentEntityName, {
    relatedEntityCount: 1,
    includeComments: false,
    includeRelationships: false,
  });
}

/**
 * Generates a comprehensive skeleton with many related entities.
 *
 * @param parentEntityName - The name of the parent entity
 * @returns Comprehensive skeleton result
 *
 * @example
 * ```typescript
 * const result = generateComprehensiveSkeleton('ORDER');
 * // Creates a detailed diagram with many related entities
 * ```
 */
export function generateComprehensiveSkeleton(
  parentEntityName: string
): SkeletonResult {
  return generateSkeletonDiagram(parentEntityName, {
    relatedEntityCount: 5,
    includeComments: true,
    includeRelationships: true,
    includeAttributes: true,
    includeParentReference: true,
  });
}

/**
 * Creates a skeleton diagram based on context from the parent diagram.
 *
 * Analyzes the parent source to extract relevant entities and relationships
 * to create a more contextually appropriate child diagram.
 *
 * @param parentEntityName - The entity to create a subdiagram for
 * @param parentSource - The Mermaid source of the parent diagram
 * @param options - Configuration options
 * @returns Contextual skeleton result
 */
export function generateContextualSkeleton(
  parentEntityName: string,
  parentSource: string,
  options: SkeletonGeneratorOptions = {}
): SkeletonResult {
  // Extract related entities from parent source
  const relatedEntities = extractRelatedEntities(parentEntityName, parentSource);

  // Generate skeleton with context
  const baseResult = generateSkeletonDiagram(parentEntityName, {
    ...options,
    relatedEntityCount: Math.max(3, relatedEntities.length),
  });

  // If we found related entities in the parent, add a comment about them
  if (relatedEntities.length > 0) {
    const contextComment = `%% Related entities from parent: ${relatedEntities.join(', ')}`;
    const sourceWithContext = baseResult.source.replace(
      'erDiagram',
      `erDiagram\n    ${contextComment}`
    );

    return {
      ...baseResult,
      source: sourceWithContext,
    };
  }

  return baseResult;
}

/**
 * Extracts entities that are related to a given entity from Mermaid source.
 *
 * @param entityName - The entity to find relations for
 * @param source - The Mermaid source code
 * @returns Array of related entity names
 */
function extractRelatedEntities(entityName: string, source: string): string[] {
  const related: Set<string> = new Set();
  const lines = source.split('\n');
  const formattedEntity = formatEntityName(entityName);

  // Match relationship patterns
  const relationshipRegex = /([A-Za-z_][A-Za-z0-9_-]*)\s*\|[|o}{-]+\s*([A-Za-z_][A-Za-z0-9_-]*)/g;

  for (const line of lines) {
    let match;
    while ((match = relationshipRegex.exec(line)) !== null) {
      const [, entity1, entity2] = match;

      // If this relationship involves our entity, add the other one
      if (entity1.toUpperCase() === formattedEntity) {
        related.add(entity2);
      } else if (entity2.toUpperCase() === formattedEntity) {
        related.add(entity1);
      }
    }
  }

  return Array.from(related);
}

/**
 * Validates a skeleton diagram by attempting to parse its structure.
 *
 * @param source - The generated Mermaid source
 * @returns Object with isValid flag and any error messages
 */
export function validateSkeleton(source: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for erDiagram declaration
  if (!source.includes('erDiagram')) {
    errors.push('Missing erDiagram declaration');
  }

  // Check for at least one entity
  const entityMatch = source.match(/[A-Z_]+\s*\{/g);
  if (!entityMatch || entityMatch.length === 0) {
    errors.push('No entity definitions found');
  }

  // Check for balanced braces
  const openBraces = (source.match(/\{/g) || []).length;
  const closeBraces = (source.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unbalanced braces in entity definitions');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
