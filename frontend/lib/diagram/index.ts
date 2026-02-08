/**
 * Diagram utilities module.
 *
 * Provides utilities for generating and manipulating Mermaid ER diagrams,
 * including skeleton generation for child diagrams.
 *
 * @module lib/diagram
 */

export {
  generateSkeletonDiagram,
  generateMinimalSkeleton,
  generateComprehensiveSkeleton,
  generateContextualSkeleton,
  validateSkeleton,
  type SkeletonGeneratorOptions,
  type SkeletonResult,
} from './skeletonGenerator';
