/**
 * DTO for updating an existing diagram
 *
 * All fields are optional - only provided fields will be updated.
 */

import {
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateDiagramDto {
  /**
   * Updated title of the diagram
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  /**
   * Updated type of diagram
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
   * Updated Mermaid source code for the diagram
   */
  @IsString()
  @IsOptional()
  mermaidSource?: string;

  /**
   * Updated theme for the diagram rendering
   */
  @IsString()
  @IsOptional()
  @IsIn(['default', 'dark', 'forest', 'neutral'])
  theme?: string;

  /**
   * Updated metadata for the diagram
   */
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
