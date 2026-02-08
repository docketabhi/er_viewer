/**
 * Block directive parser for Mermaid ER diagrams.
 *
 * Parses custom %%block: comment directives that define parent-child
 * relationships between diagrams, enabling nested ER block navigation.
 *
 * @module lib/mermaid/parser
 */

import type {
  BlockDirective,
  ParseResult,
  ParseError,
  ParserOptions,
  EntityInfo,
  EntityMap,
} from './types';

/**
 * Default parser options.
 */
const DEFAULT_PARSER_OPTIONS: Required<ParserOptions> = {
  stripDirectives: true,
  collectErrors: true,
  allowExtendedIds: true,
};

/**
 * Regex for parsing block directives.
 *
 * Format: %%block: EntityName -> diagramId=<id> [label="Label Text"]
 *
 * Groups:
 * 1. entityKey - The entity name (alphanumeric, underscore, hyphen)
 * 2. childDiagramId - The diagram ID (alphanumeric, hyphen, underscore for UUIDs)
 * 3. label - Optional quoted label text
 */
const BLOCK_DIRECTIVE_REGEX =
  /%%block:\s*([A-Za-z_][A-Za-z0-9_]*)\s*->\s*diagramId=([A-Za-z0-9_-]+)(?:\s+label="([^"]*)")?/g;

/**
 * Regex for detecting malformed block directives.
 * Matches lines that start with %%block: but may not be valid.
 */
const MALFORMED_DIRECTIVE_REGEX = /^\s*%%block:/;

/**
 * Regex for matching entity definitions in ER diagrams.
 * Matches patterns like: EntityName { or EntityName ||--o{ OtherEntity
 */
const ENTITY_DEFINITION_REGEX = /^[ \t]*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\{|\|)/;

/**
 * Regex for matching entity relationships in ER diagrams.
 * Matches both sides of relationships like: EntityA ||--o{ EntityB
 */
const ENTITY_RELATIONSHIP_REGEX =
  /([A-Za-z_][A-Za-z0-9_]*)\s*\|[|o]--[o|]\{?\s*([A-Za-z_][A-Za-z0-9_]*)/;

/**
 * Parses block directives from Mermaid source code.
 *
 * @param mermaidSource - The raw Mermaid source code
 * @returns Array of parsed block directives
 *
 * @example
 * const source = `
 * erDiagram
 *   User ||--o{ Order : places
 *   %%block: User -> diagramId=abc123 label="User Details"
 * `;
 * const blocks = parseBlockDirectives(source);
 * // [{ entityKey: "User", childDiagramId: "abc123", label: "User Details" }]
 */
export function parseBlockDirectives(mermaidSource: string): BlockDirective[] {
  const blocks: BlockDirective[] = [];
  const regex = new RegExp(BLOCK_DIRECTIVE_REGEX);
  let match;

  while ((match = regex.exec(mermaidSource)) !== null) {
    blocks.push({
      entityKey: match[1],
      childDiagramId: match[2],
      label: match[3] || undefined,
    });
  }

  return blocks;
}

/**
 * Parses Mermaid source with full result including errors and cleaned source.
 *
 * @param mermaidSource - The raw Mermaid source code
 * @param options - Parser options
 * @returns Parse result with blocks, errors, and cleaned source
 *
 * @example
 * const result = parseMermaidSource(source, { stripDirectives: true });
 * // {
 * //   blocks: [...],
 * //   errors: [...],
 * //   cleanedSource: "erDiagram\n  User ||--o{ Order : places\n"
 * // }
 */
export function parseMermaidSource(
  mermaidSource: string,
  options: ParserOptions = {}
): ParseResult {
  const opts = { ...DEFAULT_PARSER_OPTIONS, ...options };
  const blocks: BlockDirective[] = [];
  const errors: ParseError[] = [];
  const lines = mermaidSource.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check if line contains a block directive
    if (MALFORMED_DIRECTIVE_REGEX.test(line)) {
      // Try to parse the directive
      const regex = new RegExp(BLOCK_DIRECTIVE_REGEX);
      const match = regex.exec(line);

      if (match) {
        blocks.push({
          entityKey: match[1],
          childDiagramId: match[2],
          label: match[3] || undefined,
        });

        // Don't include directive in cleaned source if stripping
        if (!opts.stripDirectives) {
          cleanedLines.push(line);
        }
      } else if (opts.collectErrors) {
        // Malformed directive
        errors.push({
          line: lineNumber,
          content: line.trim(),
          message: getMalformedDirectiveError(line),
        });
        // Keep malformed lines in output (they're just comments to Mermaid)
        cleanedLines.push(line);
      }
    } else {
      cleanedLines.push(line);
    }
  }

  return {
    blocks,
    errors,
    cleanedSource: cleanedLines.join('\n'),
  };
}

/**
 * Generates a helpful error message for a malformed directive.
 *
 * @param line - The malformed directive line
 * @returns Human-readable error message
 */
function getMalformedDirectiveError(line: string): string {
  const trimmed = line.trim();

  // Check for missing arrow
  if (!trimmed.includes('->')) {
    return 'Missing "->" between entity and diagramId';
  }

  // Check for missing diagramId
  if (!trimmed.includes('diagramId=')) {
    return 'Missing "diagramId=" parameter';
  }

  // Check for missing entity name
  if (/%%block:\s*->/.test(trimmed)) {
    return 'Missing entity name before "->"';
  }

  // Check for empty diagramId
  if (/diagramId=\s*(?:$|\s)/.test(trimmed)) {
    return 'Empty diagramId value';
  }

  // Check for invalid entity name
  if (!/%%block:\s*[A-Za-z_]/.test(trimmed)) {
    return 'Entity name must start with a letter or underscore';
  }

  // Check for unclosed label
  if (/label="[^"]*$/.test(trimmed)) {
    return 'Unclosed label quotation';
  }

  return 'Invalid block directive format. Expected: %%block: EntityName -> diagramId=<id> [label="Label"]';
}

/**
 * Extracts entity names from ER diagram source.
 *
 * @param mermaidSource - The Mermaid ER diagram source
 * @returns Map of entity names to their information
 *
 * @example
 * const source = `
 * erDiagram
 *   User ||--o{ Order : places
 *   Order {
 *     int id
 *   }
 * `;
 * const entities = extractEntities(source);
 * // Map { "User" => {...}, "Order" => {...} }
 */
export function extractEntities(mermaidSource: string): EntityMap {
  const entityMap: EntityMap = new Map();
  const blocks = parseBlockDirectives(mermaidSource);
  const blocksByEntity = new Map(blocks.map((b) => [b.entityKey, b]));

  const lines = mermaidSource.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip comments and directives
    if (line.trim().startsWith('%%')) {
      continue;
    }

    // Check for entity definition with attributes
    const defMatch = ENTITY_DEFINITION_REGEX.exec(line);
    if (defMatch) {
      const entityName = defMatch[1];
      if (!entityMap.has(entityName)) {
        const block = blocksByEntity.get(entityName);
        entityMap.set(entityName, {
          name: entityName,
          line: lineNumber,
          hasBlock: !!block,
          block,
        });
      }
    }

    // Check for relationships
    const relMatch = ENTITY_RELATIONSHIP_REGEX.exec(line);
    if (relMatch) {
      const [, entity1, entity2] = relMatch;

      for (const entityName of [entity1, entity2]) {
        if (!entityMap.has(entityName)) {
          const block = blocksByEntity.get(entityName);
          entityMap.set(entityName, {
            name: entityName,
            line: lineNumber,
            hasBlock: !!block,
            block,
          });
        }
      }
    }
  }

  return entityMap;
}

/**
 * Validates that all block directives reference existing entities.
 *
 * @param mermaidSource - The Mermaid source code
 * @returns Array of validation errors (empty if valid)
 *
 * @example
 * const errors = validateBlockDirectives(source);
 * // [{ message: "Block directive references unknown entity: Foo" }]
 */
export function validateBlockDirectives(
  mermaidSource: string
): ParseError[] {
  const errors: ParseError[] = [];
  const blocks = parseBlockDirectives(mermaidSource);
  const entities = extractEntities(mermaidSource);
  const lines = mermaidSource.split('\n');

  for (const block of blocks) {
    if (!entities.has(block.entityKey)) {
      // Find the line number of this block directive
      const lineIndex = lines.findIndex(
        (line) =>
          line.includes('%%block:') && line.includes(block.entityKey)
      );

      errors.push({
        line: lineIndex + 1,
        content: lines[lineIndex]?.trim() || '',
        message: `Block directive references unknown entity: ${block.entityKey}`,
      });
    }
  }

  return errors;
}

/**
 * Checks if a string is a valid block directive format.
 *
 * @param text - Text to check
 * @returns True if the text is a valid block directive
 */
export function isBlockDirective(text: string): boolean {
  const regex = new RegExp(BLOCK_DIRECTIVE_REGEX);
  return regex.test(text);
}

/**
 * Generates a block directive string from parameters.
 *
 * @param entityKey - The entity name
 * @param childDiagramId - The child diagram ID
 * @param label - Optional label
 * @returns Formatted block directive string
 *
 * @example
 * const directive = createBlockDirective("User", "abc-123", "User Details");
 * // "%%block: User -> diagramId=abc-123 label=\"User Details\""
 */
export function createBlockDirective(
  entityKey: string,
  childDiagramId: string,
  label?: string
): string {
  let directive = `%%block: ${entityKey} -> diagramId=${childDiagramId}`;
  if (label) {
    directive += ` label="${label}"`;
  }
  return directive;
}

/**
 * Finds all block directives for a specific entity.
 *
 * @param mermaidSource - The Mermaid source code
 * @param entityKey - The entity name to find blocks for
 * @returns Block directive for the entity, or undefined
 */
export function findBlockForEntity(
  mermaidSource: string,
  entityKey: string
): BlockDirective | undefined {
  const blocks = parseBlockDirectives(mermaidSource);
  return blocks.find((b) => b.entityKey === entityKey);
}

/**
 * Counts the number of block directives in source.
 *
 * @param mermaidSource - The Mermaid source code
 * @returns Number of block directives
 */
export function countBlockDirectives(mermaidSource: string): number {
  return parseBlockDirectives(mermaidSource).length;
}
