/**
 * Diagram Blocks API client module.
 *
 * Provides typed functions for diagram block operations.
 * Blocks represent parent-child relationships between diagrams,
 * enabling the nested ER blocks feature.
 *
 * @module lib/api/blocks
 */

import { apiClient, ApiClient, ApiError } from './client';
import type {
  DiagramBlock,
  CreateBlockRequest,
  UpdateBlockRequest,
  DeleteResponse,
  RequestOptions,
} from './types';

/**
 * Creates a blocks API client.
 *
 * @param client - The base API client to use. Defaults to the global apiClient.
 * @returns Blocks API methods.
 *
 * @example
 * import { createBlocksApi } from '@/lib/api/blocks';
 *
 * const blocksApi = createBlocksApi();
 * const blocks = await blocksApi.list('diagram-123');
 */
export function createBlocksApi(client: ApiClient = apiClient) {
  /**
   * Build the base path for block endpoints.
   */
  function basePath(diagramId: string): string {
    return `/diagrams/${diagramId}/blocks`;
  }

  return {
    /**
     * List all blocks for a parent diagram.
     *
     * Each block represents a link from an entity in this diagram
     * to a child diagram.
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns Array of blocks.
     *
     * @example
     * const blocks = await blocksApi.list('diagram-123');
     * blocks.forEach(b => {
     *   console.log(`${b.parentEntityKey} -> ${b.childDiagramId}`);
     * });
     */
    async list(
      diagramId: string,
      options?: RequestOptions
    ): Promise<DiagramBlock[]> {
      return client.get<DiagramBlock[]>(basePath(diagramId), options);
    },

    /**
     * Get a specific block by ID.
     *
     * @param diagramId - The parent diagram UUID.
     * @param blockId - The block UUID.
     * @param options - Request options.
     * @returns The block.
     * @throws {ApiError} If block not found (404).
     *
     * @example
     * const block = await blocksApi.get('diagram-123', 'block-456');
     */
    async get(
      diagramId: string,
      blockId: string,
      options?: RequestOptions
    ): Promise<DiagramBlock> {
      return client.get<DiagramBlock>(
        `${basePath(diagramId)}/${blockId}`,
        options
      );
    },

    /**
     * Create a new block linking an entity to a child diagram.
     *
     * @param diagramId - The parent diagram UUID.
     * @param data - The block data.
     * @param options - Request options.
     * @returns The created block.
     * @throws {ApiError} If validation fails (400) or circular reference detected.
     *
     * @example
     * const block = await blocksApi.create('diagram-123', {
     *   parentEntityKey: 'User',
     *   childDiagramId: 'diagram-456',
     *   label: 'User Details',
     * });
     */
    async create(
      diagramId: string,
      data: CreateBlockRequest,
      options?: RequestOptions
    ): Promise<DiagramBlock> {
      return client.post<DiagramBlock>(basePath(diagramId), data, options);
    },

    /**
     * Update an existing block.
     *
     * @param diagramId - The parent diagram UUID.
     * @param blockId - The block UUID.
     * @param data - The fields to update.
     * @param options - Request options.
     * @returns The updated block.
     * @throws {ApiError} If block not found (404), validation fails, or circular reference.
     *
     * @example
     * const updated = await blocksApi.update('diagram-123', 'block-456', {
     *   childDiagramId: 'diagram-789',
     *   label: 'Updated Label',
     * });
     */
    async update(
      diagramId: string,
      blockId: string,
      data: UpdateBlockRequest,
      options?: RequestOptions
    ): Promise<DiagramBlock> {
      return client.patch<DiagramBlock>(
        `${basePath(diagramId)}/${blockId}`,
        data,
        options
      );
    },

    /**
     * Delete a block.
     *
     * @param diagramId - The parent diagram UUID.
     * @param blockId - The block UUID.
     * @param options - Request options.
     * @returns Deletion confirmation.
     * @throws {ApiError} If block not found (404).
     *
     * @example
     * const result = await blocksApi.delete('diagram-123', 'block-456');
     */
    async delete(
      diagramId: string,
      blockId: string,
      options?: RequestOptions
    ): Promise<DeleteResponse> {
      return client.delete<DeleteResponse>(
        `${basePath(diagramId)}/${blockId}`,
        options
      );
    },

    /**
     * Get the ancestry path for a diagram.
     *
     * Returns an array of diagram IDs leading to this diagram,
     * useful for building breadcrumb navigation.
     *
     * @param diagramId - The diagram UUID.
     * @param options - Request options.
     * @returns Array of ancestor diagram IDs (oldest first).
     *
     * @example
     * const ancestry = await blocksApi.getAncestry('diagram-child');
     * // ['diagram-grandparent', 'diagram-parent', 'diagram-child']
     */
    async getAncestry(
      diagramId: string,
      options?: RequestOptions
    ): Promise<string[]> {
      return client.get<string[]>(
        `/diagrams/${diagramId}/ancestry`,
        options
      );
    },

    /**
     * Find a block by entity key.
     *
     * @param diagramId - The parent diagram UUID.
     * @param entityKey - The entity key to search for.
     * @param options - Request options.
     * @returns The block if found, null otherwise.
     *
     * @example
     * const block = await blocksApi.findByEntity('diagram-123', 'User');
     * if (block) {
     *   console.log(`User links to ${block.childDiagramId}`);
     * }
     */
    async findByEntity(
      diagramId: string,
      entityKey: string,
      options?: RequestOptions
    ): Promise<DiagramBlock | null> {
      const blocks = await this.list(diagramId, options);
      return blocks.find((b) => b.parentEntityKey === entityKey) || null;
    },

    /**
     * Check if an entity has a block.
     *
     * @param diagramId - The parent diagram UUID.
     * @param entityKey - The entity key to check.
     * @param options - Request options.
     * @returns True if the entity has a block.
     *
     * @example
     * if (await blocksApi.hasBlock('diagram-123', 'User')) {
     *   console.log('User entity has a subdiagram');
     * }
     */
    async hasBlock(
      diagramId: string,
      entityKey: string,
      options?: RequestOptions
    ): Promise<boolean> {
      const block = await this.findByEntity(diagramId, entityKey, options);
      return block !== null;
    },

    /**
     * Get all child diagram IDs for a parent diagram.
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns Array of child diagram IDs.
     *
     * @example
     * const childIds = await blocksApi.getChildDiagramIds('diagram-123');
     * // Fetch all child diagrams
     * const children = await Promise.all(
     *   childIds.map(id => diagramsApi.get(id))
     * );
     */
    async getChildDiagramIds(
      diagramId: string,
      options?: RequestOptions
    ): Promise<string[]> {
      const blocks = await this.list(diagramId, options);
      return blocks.map((b) => b.childDiagramId);
    },

    /**
     * Create or update a block for an entity.
     *
     * If the entity already has a block, updates it. Otherwise creates a new one.
     *
     * @param diagramId - The parent diagram UUID.
     * @param entityKey - The entity key.
     * @param childDiagramId - The child diagram to link to.
     * @param label - Optional label for the block.
     * @param options - Request options.
     * @returns The created or updated block.
     *
     * @example
     * // Will create if User has no block, or update if it does
     * const block = await blocksApi.upsert(
     *   'diagram-123',
     *   'User',
     *   'diagram-456',
     *   'User Details'
     * );
     */
    async upsert(
      diagramId: string,
      entityKey: string,
      childDiagramId: string,
      label?: string,
      options?: RequestOptions
    ): Promise<DiagramBlock> {
      const existing = await this.findByEntity(diagramId, entityKey, options);

      if (existing) {
        return this.update(
          diagramId,
          existing.id,
          { childDiagramId, label },
          options
        );
      }

      return this.create(
        diagramId,
        { parentEntityKey: entityKey, childDiagramId, label },
        options
      );
    },

    /**
     * Delete a block by entity key.
     *
     * @param diagramId - The parent diagram UUID.
     * @param entityKey - The entity key whose block should be deleted.
     * @param options - Request options.
     * @returns Deletion confirmation, or null if no block existed.
     *
     * @example
     * const result = await blocksApi.deleteByEntity('diagram-123', 'User');
     * if (result) {
     *   console.log('Block deleted');
     * }
     */
    async deleteByEntity(
      diagramId: string,
      entityKey: string,
      options?: RequestOptions
    ): Promise<DeleteResponse | null> {
      const block = await this.findByEntity(diagramId, entityKey, options);
      if (!block) return null;
      return this.delete(diagramId, block.id, options);
    },

    /**
     * Get a map of entity keys to their blocks.
     *
     * Useful for quickly checking which entities have blocks.
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns Map of entity keys to blocks.
     *
     * @example
     * const blockMap = await blocksApi.getBlockMap('diagram-123');
     * if (blockMap.has('User')) {
     *   const userBlock = blockMap.get('User');
     *   console.log(`User links to ${userBlock.childDiagramId}`);
     * }
     */
    async getBlockMap(
      diagramId: string,
      options?: RequestOptions
    ): Promise<Map<string, DiagramBlock>> {
      const blocks = await this.list(diagramId, options);
      return new Map(blocks.map((b) => [b.parentEntityKey, b]));
    },

    /**
     * Link multiple entities to child diagrams in one operation.
     *
     * Creates blocks for all specified entity-child pairs.
     * Useful when setting up initial nested structure.
     *
     * @param diagramId - The parent diagram UUID.
     * @param links - Array of entity-child pairs.
     * @param options - Request options.
     * @returns Array of created blocks.
     *
     * @example
     * const blocks = await blocksApi.linkMultiple('diagram-123', [
     *   { entityKey: 'User', childDiagramId: 'user-detail' },
     *   { entityKey: 'Order', childDiagramId: 'order-detail' },
     * ]);
     */
    async linkMultiple(
      diagramId: string,
      links: Array<{
        entityKey: string;
        childDiagramId: string;
        label?: string;
      }>,
      options?: RequestOptions
    ): Promise<DiagramBlock[]> {
      const results = await Promise.all(
        links.map((link) =>
          this.create(
            diagramId,
            {
              parentEntityKey: link.entityKey,
              childDiagramId: link.childDiagramId,
              label: link.label,
            },
            options
          )
        )
      );
      return results;
    },

    /**
     * Validate that a block can be created without circular reference.
     *
     * Note: The server performs this check, but this client-side check
     * can prevent unnecessary API calls.
     *
     * @param diagramId - The proposed parent diagram UUID.
     * @param childDiagramId - The proposed child diagram UUID.
     * @param options - Request options.
     * @returns True if the block would be valid (no circular reference).
     *
     * @example
     * if (await blocksApi.validateLink('parent', 'child')) {
     *   await blocksApi.create('parent', { ... });
     * }
     */
    async validateLink(
      diagramId: string,
      childDiagramId: string,
      options?: RequestOptions
    ): Promise<boolean> {
      // Same diagram would be circular
      if (diagramId === childDiagramId) return false;

      try {
        // Check if child has ancestry that includes parent
        const ancestry = await this.getAncestry(childDiagramId, options);
        return !ancestry.includes(diagramId);
      } catch (error) {
        // If ancestry check fails (e.g., new diagram), assume valid
        if (error instanceof ApiError && error.isNotFound()) {
          return true;
        }
        throw error;
      }
    },
  };
}

/**
 * Default blocks API instance using the global API client.
 *
 * @example
 * import { blocksApi } from '@/lib/api/blocks';
 *
 * const blocks = await blocksApi.list('diagram-123');
 * await blocksApi.create('diagram-123', {
 *   parentEntityKey: 'User',
 *   childDiagramId: 'child-diagram',
 * });
 */
export const blocksApi = createBlocksApi();

/**
 * Re-export types for convenience.
 */
export type { DiagramBlock, CreateBlockRequest, UpdateBlockRequest };
