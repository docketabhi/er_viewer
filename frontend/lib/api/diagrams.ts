/**
 * Diagrams API client module.
 *
 * Provides typed functions for diagram CRUD operations.
 * Wraps the base API client with diagram-specific endpoints.
 *
 * @module lib/api/diagrams
 */

import { apiClient, ApiClient, ApiError } from './client';
import type {
  Diagram,
  CreateDiagramRequest,
  UpdateDiagramRequest,
  ListDiagramsQuery,
  DeleteResponse,
  RequestOptions,
} from './types';

/**
 * Creates a diagrams API client.
 *
 * @param client - The base API client to use. Defaults to the global apiClient.
 * @returns Diagrams API methods.
 *
 * @example
 * import { createDiagramsApi } from '@/lib/api/diagrams';
 *
 * const diagramsApi = createDiagramsApi();
 * const diagrams = await diagramsApi.list();
 */
export function createDiagramsApi(client: ApiClient = apiClient) {
  const BASE_PATH = '/diagrams';

  return {
    /**
     * List all diagrams, optionally filtered by type or creator.
     *
     * @param query - Optional query parameters for filtering.
     * @param options - Request options.
     * @returns Array of diagrams.
     *
     * @example
     * // List all diagrams
     * const diagrams = await diagramsApi.list();
     *
     * // List only ER diagrams
     * const erDiagrams = await diagramsApi.list({ type: 'erDiagram' });
     *
     * // List diagrams by user
     * const userDiagrams = await diagramsApi.list({ createdBy: 'user-123' });
     */
    async list(
      query?: ListDiagramsQuery,
      options?: RequestOptions
    ): Promise<Diagram[]> {
      return client.get<Diagram[]>(BASE_PATH, {
        ...options,
        params: query,
      });
    },

    /**
     * Get a single diagram by ID.
     *
     * @param id - The diagram UUID.
     * @param options - Request options.
     * @returns The diagram.
     * @throws {ApiError} If diagram not found (404).
     *
     * @example
     * const diagram = await diagramsApi.get('abc-123-def');
     */
    async get(id: string, options?: RequestOptions): Promise<Diagram> {
      return client.get<Diagram>(`${BASE_PATH}/${id}`, options);
    },

    /**
     * Create a new diagram.
     *
     * @param data - The diagram data.
     * @param options - Request options.
     * @returns The created diagram.
     * @throws {ApiError} If validation fails (400).
     *
     * @example
     * const newDiagram = await diagramsApi.create({
     *   title: 'My Diagram',
     *   mermaidSource: 'erDiagram\n  User ||--o{ Post : "writes"',
     *   type: 'erDiagram',
     *   theme: 'default',
     * });
     */
    async create(
      data: CreateDiagramRequest,
      options?: RequestOptions
    ): Promise<Diagram> {
      return client.post<Diagram>(BASE_PATH, data, options);
    },

    /**
     * Update an existing diagram.
     *
     * @param id - The diagram UUID.
     * @param data - The fields to update.
     * @param options - Request options.
     * @returns The updated diagram.
     * @throws {ApiError} If diagram not found (404) or validation fails (400).
     *
     * @example
     * const updated = await diagramsApi.update('abc-123', {
     *   title: 'New Title',
     *   mermaidSource: updatedSource,
     * });
     */
    async update(
      id: string,
      data: UpdateDiagramRequest,
      options?: RequestOptions
    ): Promise<Diagram> {
      return client.patch<Diagram>(`${BASE_PATH}/${id}`, data, options);
    },

    /**
     * Delete a diagram.
     *
     * @param id - The diagram UUID.
     * @param options - Request options.
     * @returns Deletion confirmation.
     * @throws {ApiError} If diagram not found (404).
     *
     * @example
     * const result = await diagramsApi.delete('abc-123');
     * if (result.deleted) {
     *   console.log(`Diagram ${result.id} deleted`);
     * }
     */
    async delete(id: string, options?: RequestOptions): Promise<DeleteResponse> {
      return client.delete<DeleteResponse>(`${BASE_PATH}/${id}`, options);
    },

    /**
     * Check if a diagram exists.
     *
     * @param id - The diagram UUID.
     * @param options - Request options.
     * @returns True if the diagram exists, false otherwise.
     *
     * @example
     * if (await diagramsApi.exists('abc-123')) {
     *   console.log('Diagram exists');
     * }
     */
    async exists(id: string, options?: RequestOptions): Promise<boolean> {
      try {
        await client.get<Diagram>(`${BASE_PATH}/${id}`, options);
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.isNotFound()) {
          return false;
        }
        throw error;
      }
    },

    /**
     * Duplicate a diagram with a new title.
     *
     * @param id - The diagram UUID to duplicate.
     * @param newTitle - Title for the new diagram.
     * @param options - Request options.
     * @returns The duplicated diagram.
     *
     * @example
     * const copy = await diagramsApi.duplicate('abc-123', 'Copy of My Diagram');
     */
    async duplicate(
      id: string,
      newTitle: string,
      options?: RequestOptions
    ): Promise<Diagram> {
      const original = await this.get(id, options);
      return this.create(
        {
          title: newTitle,
          mermaidSource: original.mermaidSource,
          type: original.type,
          theme: original.theme || undefined,
          metadata: original.metadata || undefined,
        },
        options
      );
    },

    /**
     * Update only the Mermaid source of a diagram.
     * Convenience method for quick source updates.
     *
     * @param id - The diagram UUID.
     * @param mermaidSource - The new Mermaid source code.
     * @param options - Request options.
     * @returns The updated diagram.
     *
     * @example
     * const updated = await diagramsApi.updateSource('abc-123', newSource);
     */
    async updateSource(
      id: string,
      mermaidSource: string,
      options?: RequestOptions
    ): Promise<Diagram> {
      return this.update(id, { mermaidSource }, options);
    },

    /**
     * Update only the title of a diagram.
     * Convenience method for quick title updates.
     *
     * @param id - The diagram UUID.
     * @param title - The new title.
     * @param options - Request options.
     * @returns The updated diagram.
     *
     * @example
     * const updated = await diagramsApi.updateTitle('abc-123', 'New Title');
     */
    async updateTitle(
      id: string,
      title: string,
      options?: RequestOptions
    ): Promise<Diagram> {
      return this.update(id, { title }, options);
    },

    /**
     * Update only the theme of a diagram.
     * Convenience method for quick theme changes.
     *
     * @param id - The diagram UUID.
     * @param theme - The new theme.
     * @param options - Request options.
     * @returns The updated diagram.
     *
     * @example
     * const updated = await diagramsApi.updateTheme('abc-123', 'dark');
     */
    async updateTheme(
      id: string,
      theme: 'default' | 'dark' | 'forest' | 'neutral',
      options?: RequestOptions
    ): Promise<Diagram> {
      return this.update(id, { theme }, options);
    },
  };
}

/**
 * Default diagrams API instance using the global API client.
 *
 * @example
 * import { diagramsApi } from '@/lib/api/diagrams';
 *
 * const diagrams = await diagramsApi.list();
 * const diagram = await diagramsApi.get('abc-123');
 * const newDiagram = await diagramsApi.create({ title: 'New', mermaidSource: 'erDiagram' });
 */
export const diagramsApi = createDiagramsApi();

/**
 * Re-export types for convenience.
 */
export type { Diagram, CreateDiagramRequest, UpdateDiagramRequest, ListDiagramsQuery };
