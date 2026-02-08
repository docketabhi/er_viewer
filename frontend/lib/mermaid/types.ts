/**
 * Type definitions for Mermaid block directives.
 *
 * Block directives allow linking entities in ER diagrams to child diagrams,
 * enabling hierarchical navigation through nested diagram structures.
 *
 * @module lib/mermaid/types
 */

/**
 * Represents a parsed block directive from Mermaid source.
 *
 * Block directives use the format:
 * %%block: EntityName -> diagramId=<uuid> label="Optional Label"
 *
 * @example
 * // Input: %%block: User -> diagramId=abc123 label="User Details"
 * // Parsed:
 * {
 *   entityKey: "User",
 *   childDiagramId: "abc123",
 *   label: "User Details"
 * }
 */
export interface BlockDirective {
  /**
   * The entity key/name in the parent ER diagram.
   * This identifies which entity node should have a clickable badge.
   */
  entityKey: string;

  /**
   * The ID of the child diagram to navigate to when clicked.
   * This should be a valid diagram ID in the database.
   */
  childDiagramId: string;

  /**
   * Optional display label for the block badge tooltip.
   * If not provided, defaults to showing the child diagram's title.
   */
  label?: string;
}

/**
 * Result of parsing Mermaid source for block directives.
 */
export interface ParseResult {
  /**
   * Successfully parsed block directives.
   */
  blocks: BlockDirective[];

  /**
   * Lines containing malformed block directives.
   * Used for error reporting and editor hints.
   */
  errors: ParseError[];

  /**
   * The Mermaid source with block directive comments stripped.
   * This can be passed to Mermaid renderer safely.
   */
  cleanedSource: string;
}

/**
 * Represents a parsing error for a malformed block directive.
 */
export interface ParseError {
  /**
   * The line number (1-indexed) where the error occurred.
   */
  line: number;

  /**
   * The raw content of the malformed directive line.
   */
  content: string;

  /**
   * Human-readable error message describing what went wrong.
   */
  message: string;
}

/**
 * Options for the block directive parser.
 */
export interface ParserOptions {
  /**
   * Whether to strip block directive comments from the source.
   * Defaults to true.
   */
  stripDirectives?: boolean;

  /**
   * Whether to collect parsing errors.
   * Defaults to true.
   */
  collectErrors?: boolean;

  /**
   * Whether to allow any alphanumeric/dash/underscore characters in IDs.
   * When false, only alphanumeric characters are allowed.
   * Defaults to true for UUID support.
   */
  allowExtendedIds?: boolean;
}

/**
 * Entity information extracted from ER diagram source.
 */
export interface EntityInfo {
  /**
   * The entity name/key as it appears in the diagram.
   */
  name: string;

  /**
   * Line number where the entity is defined (1-indexed).
   */
  line: number;

  /**
   * Whether this entity has a block directive linking it to a child diagram.
   */
  hasBlock: boolean;

  /**
   * The block directive for this entity, if any.
   */
  block?: BlockDirective;
}

/**
 * Maps entity names to their information.
 */
export type EntityMap = Map<string, EntityInfo>;
