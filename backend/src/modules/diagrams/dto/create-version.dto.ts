/**
 * DTO for creating a new diagram version
 *
 * Validates input data for version creation endpoint.
 * All fields are optional since a version can be created
 * as a simple snapshot of the current diagram state.
 */

import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateVersionDto {
  /**
   * Optional label for the version (e.g., "v1.0", "Before refactor")
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  versionLabel?: string;

  /**
   * User ID who created the version (optional, will be set from auth context in future)
   */
  @IsString()
  @IsOptional()
  createdBy?: string;
}
