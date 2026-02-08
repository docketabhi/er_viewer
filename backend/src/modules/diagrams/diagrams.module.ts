/**
 * Diagrams Module
 *
 * NestJS module for diagram-related functionality.
 * Exports DiagramsService for use by other modules (e.g., blocks, versions).
 */

import { Module } from '@nestjs/common';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';

@Module({
  controllers: [DiagramsController],
  providers: [DiagramsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
