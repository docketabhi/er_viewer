/**
 * Versions Service
 *
 * Business logic for diagram version CRUD operations.
 * Handles creating snapshots and restoring previous versions.
 * Uses Drizzle ORM for database operations.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import {
  db,
  diagramVersions,
  diagrams,
  DiagramVersion,
  NewDiagramVersion,
  Diagram,
} from '../../db';
import { DiagramsService } from './diagrams.service';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionsService {
  constructor(private readonly diagramsService: DiagramsService) {}

  /**
   * Create a new version snapshot of a diagram
   * Captures the current mermaidSource as a version
   */
  async create(
    diagramId: string,
    createVersionDto?: CreateVersionDto,
  ): Promise<DiagramVersion> {
    // Verify diagram exists and get current state
    const diagram = await this.diagramsService.findOne(diagramId);

    const newVersion: NewDiagramVersion = {
      diagramId,
      mermaidSource: diagram.mermaidSource,
      versionLabel: createVersionDto?.versionLabel,
      createdBy: createVersionDto?.createdBy,
    };

    const [created] = await db
      .insert(diagramVersions)
      .values(newVersion)
      .returning();

    return created;
  }

  /**
   * Create a version from specific source (used when updating a diagram)
   * This allows saving the pre-update state as a version
   */
  async createFromSource(
    diagramId: string,
    mermaidSource: string,
    options?: { versionLabel?: string; createdBy?: string },
  ): Promise<DiagramVersion> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const newVersion: NewDiagramVersion = {
      diagramId,
      mermaidSource,
      versionLabel: options?.versionLabel,
      createdBy: options?.createdBy,
    };

    const [created] = await db
      .insert(diagramVersions)
      .values(newVersion)
      .returning();

    return created;
  }

  /**
   * Get all versions for a diagram, ordered by most recent first
   */
  async findAllByDiagram(diagramId: string): Promise<DiagramVersion[]> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    return db
      .select()
      .from(diagramVersions)
      .where(eq(diagramVersions.diagramId, diagramId))
      .orderBy(desc(diagramVersions.createdAt));
  }

  /**
   * Get a single version by ID
   */
  async findOne(id: string): Promise<DiagramVersion> {
    const [version] = await db
      .select()
      .from(diagramVersions)
      .where(eq(diagramVersions.id, id))
      .limit(1);

    if (!version) {
      throw new NotFoundException(`Version with ID "${id}" not found`);
    }

    return version;
  }

  /**
   * Get a specific version by diagram ID and version ID
   * Ensures the version belongs to the specified diagram
   */
  async findOneByDiagram(
    diagramId: string,
    versionId: string,
  ): Promise<DiagramVersion> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const version = await this.findOne(versionId);

    if (version.diagramId !== diagramId) {
      throw new NotFoundException(
        `Version with ID "${versionId}" not found for diagram "${diagramId}"`,
      );
    }

    return version;
  }

  /**
   * Restore a diagram to a previous version
   * Updates the diagram's mermaidSource with the version's content
   */
  async restore(
    diagramId: string,
    versionId: string,
  ): Promise<Diagram> {
    // Get the version (this also validates the diagram exists and version belongs to it)
    const version = await this.findOneByDiagram(diagramId, versionId);

    // Update the diagram with the version's mermaidSource
    const [updated] = await db
      .update(diagrams)
      .set({
        mermaidSource: version.mermaidSource,
        updatedAt: new Date(),
      })
      .where(eq(diagrams.id, diagramId))
      .returning();

    return updated;
  }

  /**
   * Delete a specific version
   */
  async remove(
    diagramId: string,
    versionId: string,
  ): Promise<{ deleted: boolean; id: string }> {
    // Verify version exists and belongs to diagram
    await this.findOneByDiagram(diagramId, versionId);

    await db.delete(diagramVersions).where(eq(diagramVersions.id, versionId));

    return { deleted: true, id: versionId };
  }

  /**
   * Delete all versions for a diagram
   * Useful when deleting a diagram or clearing history
   */
  async removeAllByDiagram(diagramId: string): Promise<{ deleted: number }> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const result = await db
      .delete(diagramVersions)
      .where(eq(diagramVersions.diagramId, diagramId))
      .returning();

    return { deleted: result.length };
  }

  /**
   * Get the version count for a diagram
   */
  async countByDiagram(diagramId: string): Promise<number> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const versions = await db
      .select()
      .from(diagramVersions)
      .where(eq(diagramVersions.diagramId, diagramId));

    return versions.length;
  }

  /**
   * Get the most recent version for a diagram
   */
  async findLatestByDiagram(diagramId: string): Promise<DiagramVersion | null> {
    // Verify diagram exists
    await this.diagramsService.findOne(diagramId);

    const [latest] = await db
      .select()
      .from(diagramVersions)
      .where(eq(diagramVersions.diagramId, diagramId))
      .orderBy(desc(diagramVersions.createdAt))
      .limit(1);

    return latest || null;
  }
}
