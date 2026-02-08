/**
 * Mermaid rendering utilities and configuration.
 *
 * @module lib/mermaid
 */

// Configuration exports
export {
  createMermaidConfig,
  getThemeForMode,
  DEFAULT_MERMAID_CONFIG,
} from './config';

export type {
  MermaidTheme,
  MermaidPreviewConfig,
} from './config';

// Parser exports
export {
  parseBlockDirectives,
  parseMermaidSource,
  extractEntities,
  validateBlockDirectives,
  isBlockDirective,
  createBlockDirective,
  findBlockForEntity,
  countBlockDirectives,
} from './parser';

// Type exports
export type {
  BlockDirective,
  ParseResult,
  ParseError,
  ParserOptions,
  EntityInfo,
  EntityMap,
} from './types';
