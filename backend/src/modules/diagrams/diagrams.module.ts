/**
 * Diagrams Module
 *
 * NestJS module for diagram-related functionality.
 * Exports DiagramsService and VersionsService for use by other modules.
 */

import { Module } from '@nestjs/common';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';
import { VersionsService } from './versions.service';

@Module({
  controllers: [DiagramsController],
  providers: [DiagramsService, VersionsService],
  exports: [DiagramsService, VersionsService],
})
export class DiagramsModule {}
