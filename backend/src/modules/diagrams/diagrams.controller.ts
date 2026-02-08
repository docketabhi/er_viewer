/**
 * Diagrams Controller
 *
 * REST API endpoints for diagram, version, and block CRUD operations.
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
import { VersionsService } from './versions.service';
import { BlocksService } from './blocks.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { CreateBlockDto, UpdateBlockDto } from './dto/create-block.dto';
import { Diagram, DiagramVersion, DiagramBlock } from '../../db';

@Controller('diagrams')
export class DiagramsController {
  constructor(
    private readonly diagramsService: DiagramsService,
    private readonly versionsService: VersionsService,
    private readonly blocksService: BlocksService,
  ) {}

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

  // =====================
  // VERSION ENDPOINTS
  // =====================

  /**
   * Create a new version snapshot of a diagram
   * POST /diagrams/:id/versions
   */
  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() createVersionDto: CreateVersionDto,
  ): Promise<DiagramVersion> {
    return this.versionsService.create(id, createVersionDto);
  }

  /**
   * Get all versions for a diagram
   * GET /diagrams/:id/versions
   */
  @Get(':id/versions')
  async findAllVersions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DiagramVersion[]> {
    return this.versionsService.findAllByDiagram(id);
  }

  /**
   * Get a specific version by ID
   * GET /diagrams/:id/versions/:versionId
   */
  @Get(':id/versions/:versionId')
  async findOneVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<DiagramVersion> {
    return this.versionsService.findOneByDiagram(id, versionId);
  }

  /**
   * Restore a diagram to a previous version
   * POST /diagrams/:id/versions/:versionId/restore
   */
  @Post(':id/versions/:versionId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<Diagram> {
    return this.versionsService.restore(id, versionId);
  }

  /**
   * Delete a specific version
   * DELETE /diagrams/:id/versions/:versionId
   */
  @Delete(':id/versions/:versionId')
  @HttpCode(HttpStatus.OK)
  async removeVersion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.versionsService.remove(id, versionId);
  }

  // =====================
  // BLOCK ENDPOINTS
  // =====================

  /**
   * Create a new block linking a parent entity to a child diagram
   * POST /diagrams/:id/blocks
   */
  @Post(':id/blocks')
  @HttpCode(HttpStatus.CREATED)
  async createBlock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() createBlockDto: CreateBlockDto,
  ): Promise<DiagramBlock> {
    return this.blocksService.create(id, createBlockDto);
  }

  /**
   * Get all blocks for a diagram (child diagram links)
   * GET /diagrams/:id/blocks
   */
  @Get(':id/blocks')
  async findAllBlocks(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DiagramBlock[]> {
    return this.blocksService.findAllByParent(id);
  }

  /**
   * Get ancestry path for a diagram (parent diagrams leading to this one)
   * GET /diagrams/:id/ancestry
   */
  @Get(':id/ancestry')
  async getAncestry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<string[]> {
    return this.blocksService.getAncestryPath(id);
  }

  /**
   * Get a specific block by ID
   * GET /diagrams/:id/blocks/:blockId
   */
  @Get(':id/blocks/:blockId')
  async findOneBlock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('blockId', new ParseUUIDPipe({ version: '4' })) blockId: string,
  ): Promise<DiagramBlock> {
    return this.blocksService.findOneByParent(id, blockId);
  }

  /**
   * Update a block
   * PATCH /diagrams/:id/blocks/:blockId
   */
  @Patch(':id/blocks/:blockId')
  async updateBlock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('blockId', new ParseUUIDPipe({ version: '4' })) blockId: string,
    @Body() updateBlockDto: UpdateBlockDto,
  ): Promise<DiagramBlock> {
    return this.blocksService.update(id, blockId, updateBlockDto);
  }

  /**
   * Delete a specific block
   * DELETE /diagrams/:id/blocks/:blockId
   */
  @Delete(':id/blocks/:blockId')
  @HttpCode(HttpStatus.OK)
  async removeBlock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('blockId', new ParseUUIDPipe({ version: '4' })) blockId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.blocksService.remove(id, blockId);
  }
}
