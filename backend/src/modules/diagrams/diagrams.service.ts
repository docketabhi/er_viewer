/**
 * Diagrams Service
 *
 * Business logic for diagram CRUD operations.
 * Uses Drizzle ORM for database operations.
 *
 * Note: Version history/snapshots are handled by VersionsService.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, diagrams, Diagram, NewDiagram } from '../../db';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';

@Injectable()
export class DiagramsService {
  /**
   * Create a new diagram
   */
  async create(createDiagramDto: CreateDiagramDto): Promise<Diagram> {
    const newDiagram: NewDiagram = {
      title: createDiagramDto.title,
      type: createDiagramDto.type || 'erDiagram',
      mermaidSource: createDiagramDto.mermaidSource,
      theme: createDiagramDto.theme || 'default',
      createdBy: createDiagramDto.createdBy,
      metadata: createDiagramDto.metadata,
    };

    const [created] = await db.insert(diagrams).values(newDiagram).returning();
    return created;
  }

  /**
   * Get all diagrams, ordered by most recently updated
   */
  async findAll(): Promise<Diagram[]> {
    return db.select().from(diagrams).orderBy(desc(diagrams.updatedAt));
  }

  /**
   * Get a single diagram by ID
   */
  async findOne(id: string): Promise<Diagram> {
    const [diagram] = await db
      .select()
      .from(diagrams)
      .where(eq(diagrams.id, id))
      .limit(1);

    if (!diagram) {
      throw new NotFoundException(`Diagram with ID "${id}" not found`);
    }

    return diagram;
  }

  /**
   * Update an existing diagram
   */
  async update(id: string, updateDiagramDto: UpdateDiagramDto): Promise<Diagram> {
    // First check if diagram exists
    await this.findOne(id);

    // Build update object with only provided fields
    const updateData: Partial<NewDiagram> = {
      updatedAt: new Date(),
    };

    if (updateDiagramDto.title !== undefined) {
      updateData.title = updateDiagramDto.title;
    }
    if (updateDiagramDto.type !== undefined) {
      updateData.type = updateDiagramDto.type;
    }
    if (updateDiagramDto.mermaidSource !== undefined) {
      updateData.mermaidSource = updateDiagramDto.mermaidSource;
    }
    if (updateDiagramDto.theme !== undefined) {
      updateData.theme = updateDiagramDto.theme;
    }
    if (updateDiagramDto.metadata !== undefined) {
      updateData.metadata = updateDiagramDto.metadata;
    }

    const [updated] = await db
      .update(diagrams)
      .set(updateData)
      .where(eq(diagrams.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a diagram by ID
   */
  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    // First check if diagram exists
    await this.findOne(id);

    await db.delete(diagrams).where(eq(diagrams.id, id));

    return { deleted: true, id };
  }

  /**
   * Get diagrams by user
   */
  async findByUser(userId: string): Promise<Diagram[]> {
    return db
      .select()
      .from(diagrams)
      .where(eq(diagrams.createdBy, userId))
      .orderBy(desc(diagrams.updatedAt));
  }

  /**
   * Get diagrams by type
   */
  async findByType(type: string): Promise<Diagram[]> {
    return db
      .select()
      .from(diagrams)
      .where(eq(diagrams.type, type))
      .orderBy(desc(diagrams.updatedAt));
  }
}
