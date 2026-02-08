/**
 * Blocks Service
 *
 * Business logic for diagram block CRUD operations.
 * Handles parent-child relationships for nested ER blocks.
 * Uses Drizzle ORM for database operations.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import {
  db,
  diagramBlocks,
  diagrams,
  DiagramBlock,
  NewDiagramBlock,
} from '../../db';
import { DiagramsService } from './diagrams.service';
import { CreateBlockDto, UpdateBlockDto } from './dto/create-block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly diagramsService: DiagramsService) {}

  /**
   * Create a new block linking a parent entity to a child diagram
   */
  async create(
    parentDiagramId: string,
    createBlockDto: CreateBlockDto,
  ): Promise<DiagramBlock> {
    // Verify parent diagram exists
    await this.diagramsService.findOne(parentDiagramId);

    // Verify child diagram exists
    await this.diagramsService.findOne(createBlockDto.childDiagramId);

    // Check for circular reference (child cannot link back to parent)
    if (parentDiagramId === createBlockDto.childDiagramId) {
      throw new BadRequestException(
        'Cannot create a block that links a diagram to itself',
      );
    }

    // Check for deeper circular references
    await this.checkCircularReference(
      parentDiagramId,
      createBlockDto.childDiagramId,
    );

    // Check if entity key already has a block in this parent diagram
    const existingBlock = await this.findByEntityKey(
      parentDiagramId,
      createBlockDto.parentEntityKey,
    );
    if (existingBlock) {
      throw new ConflictException(
        `Entity "${createBlockDto.parentEntityKey}" already has a block in diagram "${parentDiagramId}"`,
      );
    }

    const newBlock: NewDiagramBlock = {
      parentDiagramId,
      parentEntityKey: createBlockDto.parentEntityKey,
      childDiagramId: createBlockDto.childDiagramId,
      label: createBlockDto.label,
      createdBy: createBlockDto.createdBy,
    };

    const [created] = await db.insert(diagramBlocks).values(newBlock).returning();
    return created;
  }

  /**
   * Get all blocks for a parent diagram
   */
  async findAllByParent(parentDiagramId: string): Promise<DiagramBlock[]> {
    // Verify diagram exists
    await this.diagramsService.findOne(parentDiagramId);

    return db
      .select()
      .from(diagramBlocks)
      .where(eq(diagramBlocks.parentDiagramId, parentDiagramId))
      .orderBy(desc(diagramBlocks.createdAt));
  }

  /**
   * Get all blocks where a diagram is the child (parent diagrams linking to this one)
   */
  async findAllByChild(childDiagramId: string): Promise<DiagramBlock[]> {
    // Verify diagram exists
    await this.diagramsService.findOne(childDiagramId);

    return db
      .select()
      .from(diagramBlocks)
      .where(eq(diagramBlocks.childDiagramId, childDiagramId))
      .orderBy(desc(diagramBlocks.createdAt));
  }

  /**
   * Get a single block by ID
   */
  async findOne(id: string): Promise<DiagramBlock> {
    const [block] = await db
      .select()
      .from(diagramBlocks)
      .where(eq(diagramBlocks.id, id))
      .limit(1);

    if (!block) {
      throw new NotFoundException(`Block with ID "${id}" not found`);
    }

    return block;
  }

  /**
   * Get a block by parent diagram ID and block ID
   * Ensures the block belongs to the specified parent diagram
   */
  async findOneByParent(
    parentDiagramId: string,
    blockId: string,
  ): Promise<DiagramBlock> {
    // Verify diagram exists
    await this.diagramsService.findOne(parentDiagramId);

    const block = await this.findOne(blockId);

    if (block.parentDiagramId !== parentDiagramId) {
      throw new NotFoundException(
        `Block with ID "${blockId}" not found in diagram "${parentDiagramId}"`,
      );
    }

    return block;
  }

  /**
   * Get a block by parent diagram ID and entity key
   */
  async findByEntityKey(
    parentDiagramId: string,
    entityKey: string,
  ): Promise<DiagramBlock | null> {
    const [block] = await db
      .select()
      .from(diagramBlocks)
      .where(
        and(
          eq(diagramBlocks.parentDiagramId, parentDiagramId),
          eq(diagramBlocks.parentEntityKey, entityKey),
        ),
      )
      .limit(1);

    return block || null;
  }

  /**
   * Update a block
   */
  async update(
    parentDiagramId: string,
    blockId: string,
    updateBlockDto: UpdateBlockDto,
  ): Promise<DiagramBlock> {
    // Verify block exists and belongs to parent
    const existingBlock = await this.findOneByParent(parentDiagramId, blockId);

    // If updating child diagram, verify it exists and check for circular reference
    if (updateBlockDto.childDiagramId) {
      await this.diagramsService.findOne(updateBlockDto.childDiagramId);

      if (parentDiagramId === updateBlockDto.childDiagramId) {
        throw new BadRequestException(
          'Cannot create a block that links a diagram to itself',
        );
      }

      await this.checkCircularReference(
        parentDiagramId,
        updateBlockDto.childDiagramId,
      );
    }

    // Build update object
    const updateData: Partial<NewDiagramBlock> = {};

    if (updateBlockDto.childDiagramId !== undefined) {
      updateData.childDiagramId = updateBlockDto.childDiagramId;
    }
    if (updateBlockDto.label !== undefined) {
      updateData.label = updateBlockDto.label;
    }

    // If nothing to update, return existing block
    if (Object.keys(updateData).length === 0) {
      return existingBlock;
    }

    const [updated] = await db
      .update(diagramBlocks)
      .set(updateData)
      .where(eq(diagramBlocks.id, blockId))
      .returning();

    return updated;
  }

  /**
   * Delete a block
   */
  async remove(
    parentDiagramId: string,
    blockId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    // Verify block exists and belongs to parent
    await this.findOneByParent(parentDiagramId, blockId);

    await db.delete(diagramBlocks).where(eq(diagramBlocks.id, blockId));

    return { deleted: true, id: blockId };
  }

  /**
   * Delete all blocks for a parent diagram
   */
  async removeAllByParent(parentDiagramId: string): Promise<{ deleted: number }> {
    // Verify diagram exists
    await this.diagramsService.findOne(parentDiagramId);

    const result = await db
      .delete(diagramBlocks)
      .where(eq(diagramBlocks.parentDiagramId, parentDiagramId))
      .returning();

    return { deleted: result.length };
  }

  /**
   * Get the block count for a parent diagram
   */
  async countByParent(parentDiagramId: string): Promise<number> {
    // Verify diagram exists
    await this.diagramsService.findOne(parentDiagramId);

    const blocks = await db
      .select()
      .from(diagramBlocks)
      .where(eq(diagramBlocks.parentDiagramId, parentDiagramId));

    return blocks.length;
  }

  /**
   * Get the ancestry path for a diagram (parent diagrams leading to this one)
   * Returns an array of diagram IDs from root to the current diagram
   */
  async getAncestryPath(diagramId: string): Promise<string[]> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const path: string[] = [diagramId];
    let currentId = diagramId;
    const visited = new Set<string>([diagramId]);

    while (true) {
      // Find a parent block where this diagram is the child
      const [parentBlock] = await db
        .select()
        .from(diagramBlocks)
        .where(eq(diagramBlocks.childDiagramId, currentId))
        .limit(1);

      if (!parentBlock) {
        break; // No parent, we've reached the root
      }

      if (visited.has(parentBlock.parentDiagramId)) {
        break; // Circular reference detected, stop
      }

      visited.add(parentBlock.parentDiagramId);
      path.unshift(parentBlock.parentDiagramId);
      currentId = parentBlock.parentDiagramId;
    }

    return path;
  }

  /**
   * Check for circular references when creating or updating a block
   * Throws BadRequestException if a circular reference would be created
   */
  private async checkCircularReference(
    parentDiagramId: string,
    childDiagramId: string,
  ): Promise<void> {
    // Get all ancestors of the parent diagram
    const parentAncestry = await this.getAncestryPath(parentDiagramId);

    // If the child diagram is already an ancestor of the parent, it's circular
    if (parentAncestry.includes(childDiagramId)) {
      throw new BadRequestException(
        'Creating this block would result in a circular reference',
      );
    }

    // Check if child has the parent as a descendant (child -> ... -> parent)
    const childDescendants = await this.getAllDescendants(childDiagramId);
    if (childDescendants.includes(parentDiagramId)) {
      throw new BadRequestException(
        'Creating this block would result in a circular reference',
      );
    }
  }

  /**
   * Get all descendant diagram IDs for a given diagram
   */
  private async getAllDescendants(diagramId: string): Promise<string[]> {
    const descendants: string[] = [];
    const toVisit: string[] = [diagramId];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
      const currentId = toVisit.pop()!;
      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      // Get all blocks where this diagram is the parent
      const childBlocks = await db
        .select()
        .from(diagramBlocks)
        .where(eq(diagramBlocks.parentDiagramId, currentId));

      for (const block of childBlocks) {
        if (!visited.has(block.childDiagramId)) {
          descendants.push(block.childDiagramId);
          toVisit.push(block.childDiagramId);
        }
      }
    }

    return descendants;
  }
}
