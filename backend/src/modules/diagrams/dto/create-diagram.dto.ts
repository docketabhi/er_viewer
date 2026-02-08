/**
 * DTO for creating a new diagram
 *
 * Validates input data for diagram creation endpoint.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateDiagramDto {
  /**
   * Title of the diagram
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  /**
   * Type of diagram (defaults to 'erDiagram' if not provided)
   */
  @IsString()
  @IsOptional()
  @IsIn([
    'erDiagram',
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'gantt',
    'pie',
    'mindmap',
  ])
  type?: string;

  /**
   * Mermaid source code for the diagram
   */
  @IsString()
  @IsNotEmpty()
  mermaidSource: string;

  /**
   * Theme for the diagram rendering
   */
  @IsString()
  @IsOptional()
  @IsIn(['default', 'dark', 'forest', 'neutral'])
  theme?: string;

  /**
   * User ID who created the diagram (optional, will be set from auth context in future)
   */
  @IsString()
  @IsOptional()
  createdBy?: string;

  /**
   * Additional metadata for the diagram (optional)
   */
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
