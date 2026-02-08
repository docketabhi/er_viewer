/**
 * Diagrams Module
 *
 * NestJS module for diagram-related functionality.
 * Exports DiagramsService, VersionsService, and BlocksService for use by other modules.
 */

import { Module } from '@nestjs/common';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';
import { VersionsService } from './versions.service';
import { BlocksService } from './blocks.service';

@Module({
  controllers: [DiagramsController],
  providers: [DiagramsService, VersionsService, BlocksService],
  exports: [DiagramsService, VersionsService, BlocksService],
})
export class DiagramsModule {}
