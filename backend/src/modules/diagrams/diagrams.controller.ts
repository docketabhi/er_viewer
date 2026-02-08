/**
 * Diagrams Controller
 *
 * REST API endpoints for diagram CRUD operations.
 * Follows RESTful conventions with proper HTTP methods and status codes.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';
import { Diagram } from '../../db';

@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  /**
   * Create a new diagram
   * POST /diagrams
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDiagramDto: CreateDiagramDto): Promise<Diagram> {
    return this.diagramsService.create(createDiagramDto);
  }

  /**
   * Get all diagrams
   * GET /diagrams
   * Optional query params: type, createdBy
   */
  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('createdBy') createdBy?: string,
  ): Promise<Diagram[]> {
    if (type) {
      return this.diagramsService.findByType(type);
    }
    if (createdBy) {
      return this.diagramsService.findByUser(createdBy);
    }
    return this.diagramsService.findAll();
  }

  /**
   * Get a single diagram by ID
   * GET /diagrams/:id
   */
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Diagram> {
    return this.diagramsService.findOne(id);
  }

  /**
   * Update a diagram
   * PATCH /diagrams/:id
   */
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDiagramDto: UpdateDiagramDto,
  ): Promise<Diagram> {
    return this.diagramsService.update(id, updateDiagramDto);
  }

  /**
   * Delete a diagram
   * DELETE /diagrams/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.diagramsService.remove(id);
  }
}
