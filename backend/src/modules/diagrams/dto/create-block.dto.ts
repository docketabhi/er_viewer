/**
 * DTO for creating a new diagram block
 *
 * Validates input data for block creation endpoint.
 * A block represents a link from an entity in a parent diagram to a child diagram.
 */

import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateBlockDto {
  /**
   * The entity key in the parent diagram that will link to the child
   * This corresponds to the entity name used in the %%block: directive
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  parentEntityKey: string;

  /**
   * The ID of the child diagram that this block links to
   */
  @IsUUID('4')
  @IsNotEmpty()
  childDiagramId: string;

  /**
   * Optional label displayed on the block badge
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;

  /**
   * User ID who created the block (optional, will be set from auth context in future)
   */
  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateBlockDto {
  /**
   * Updated child diagram ID
   */
  @IsUUID('4')
  @IsOptional()
  childDiagramId?: string;

  /**
   * Updated label displayed on the block badge
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;
}
