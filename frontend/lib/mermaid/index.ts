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

// SVG Processor exports
export {
  findEntityNodes,
  processSvg,
  getEntityNodeInfo,
  hasEntityNode,
  getEntityNames,
  getEntityBoundingBox,
  cleanupEntityHandlers,
  applyEntityHoverStyles,
} from './svgProcessor';

export type {
  EntityNodeInfo,
  ProcessedSvg,
  ProcessSvgOptions,
} from './svgProcessor';

// Type exports
export type {
  BlockDirective,
  ParseResult,
  ParseError,
  ParserOptions,
  EntityInfo,
  EntityMap,
} from './types';
