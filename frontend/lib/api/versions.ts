/**
 * Diagram Versions API client module.
 *
 * Provides typed functions for diagram version (snapshot) operations.
 * Enables history tracking, restore, and version management.
 *
 * @module lib/api/versions
 */

import { apiClient, ApiClient } from './client';
import type {
  Diagram,
  DiagramVersion,
  CreateVersionRequest,
  DeleteResponse,
  RequestOptions,
} from './types';

/**
 * Creates a versions API client.
 *
 * @param client - The base API client to use. Defaults to the global apiClient.
 * @returns Versions API methods.
 *
 * @example
 * import { createVersionsApi } from '@/lib/api/versions';
 *
 * const versionsApi = createVersionsApi();
 * const versions = await versionsApi.list('diagram-123');
 */
export function createVersionsApi(client: ApiClient = apiClient) {
  /**
   * Build the base path for version endpoints.
   */
  function basePath(diagramId: string): string {
    return `/diagrams/${diagramId}/versions`;
  }

  return {
    /**
     * List all versions for a diagram.
     *
     * Versions are ordered by creation date (newest first).
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns Array of versions.
     *
     * @example
     * const versions = await versionsApi.list('diagram-123');
     * versions.forEach(v => {
     *   console.log(`${v.versionLabel}: ${v.createdAt}`);
     * });
     */
    async list(
      diagramId: string,
      options?: RequestOptions
    ): Promise<DiagramVersion[]> {
      return client.get<DiagramVersion[]>(basePath(diagramId), options);
    },

    /**
     * Get a specific version by ID.
     *
     * @param diagramId - The parent diagram UUID.
     * @param versionId - The version UUID.
     * @param options - Request options.
     * @returns The version.
     * @throws {ApiError} If version not found (404).
     *
     * @example
     * const version = await versionsApi.get('diagram-123', 'version-456');
     * console.log(version.mermaidSource);
     */
    async get(
      diagramId: string,
      versionId: string,
      options?: RequestOptions
    ): Promise<DiagramVersion> {
      return client.get<DiagramVersion>(
        `${basePath(diagramId)}/${versionId}`,
        options
      );
    },

    /**
     * Create a new version snapshot of the current diagram state.
     *
     * This saves the current mermaidSource as a version that can be
     * restored later.
     *
     * @param diagramId - The parent diagram UUID.
     * @param data - Optional version metadata (label, creator).
     * @param options - Request options.
     * @returns The created version.
     *
     * @example
     * // Create a simple snapshot
     * const version = await versionsApi.create('diagram-123');
     *
     * // Create a labeled snapshot
     * const labeledVersion = await versionsApi.create('diagram-123', {
     *   versionLabel: 'Before major refactor',
     * });
     */
    async create(
      diagramId: string,
      data?: CreateVersionRequest,
      options?: RequestOptions
    ): Promise<DiagramVersion> {
      return client.post<DiagramVersion>(
        basePath(diagramId),
        data || {},
        options
      );
    },

    /**
     * Restore a diagram to a previous version.
     *
     * This replaces the diagram's current mermaidSource with the
     * version's content. The current state is NOT automatically saved
     * as a new version - call create() first if you want to preserve it.
     *
     * @param diagramId - The parent diagram UUID.
     * @param versionId - The version UUID to restore.
     * @param options - Request options.
     * @returns The updated diagram with restored content.
     *
     * @example
     * // Save current state before restoring
     * await versionsApi.create('diagram-123', {
     *   versionLabel: 'Auto-save before restore',
     * });
     *
     * // Restore to an older version
     * const diagram = await versionsApi.restore('diagram-123', 'version-456');
     */
    async restore(
      diagramId: string,
      versionId: string,
      options?: RequestOptions
    ): Promise<Diagram> {
      return client.post<Diagram>(
        `${basePath(diagramId)}/${versionId}/restore`,
        {},
        options
      );
    },

    /**
     * Delete a specific version.
     *
     * @param diagramId - The parent diagram UUID.
     * @param versionId - The version UUID to delete.
     * @param options - Request options.
     * @returns Deletion confirmation.
     * @throws {ApiError} If version not found (404).
     *
     * @example
     * const result = await versionsApi.delete('diagram-123', 'version-456');
     */
    async delete(
      diagramId: string,
      versionId: string,
      options?: RequestOptions
    ): Promise<DeleteResponse> {
      return client.delete<DeleteResponse>(
        `${basePath(diagramId)}/${versionId}`,
        options
      );
    },

    /**
     * Get the count of versions for a diagram.
     *
     * Note: This fetches all versions and counts them client-side.
     * For very large version histories, consider adding a server-side
     * count endpoint.
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns The number of versions.
     *
     * @example
     * const count = await versionsApi.count('diagram-123');
     * console.log(`${count} versions available`);
     */
    async count(diagramId: string, options?: RequestOptions): Promise<number> {
      const versions = await this.list(diagramId, options);
      return versions.length;
    },

    /**
     * Get the most recent version for a diagram.
     *
     * @param diagramId - The parent diagram UUID.
     * @param options - Request options.
     * @returns The most recent version, or null if no versions exist.
     *
     * @example
     * const latest = await versionsApi.getLatest('diagram-123');
     * if (latest) {
     *   console.log(`Last saved: ${latest.createdAt}`);
     * }
     */
    async getLatest(
      diagramId: string,
      options?: RequestOptions
    ): Promise<DiagramVersion | null> {
      const versions = await this.list(diagramId, options);
      return versions.length > 0 ? versions[0] : null;
    },

    /**
     * Create a labeled snapshot with automatic naming.
     *
     * Convenience method that generates a timestamp-based label.
     *
     * @param diagramId - The parent diagram UUID.
     * @param prefix - Optional prefix for the label.
     * @param options - Request options.
     * @returns The created version.
     *
     * @example
     * // Creates version with label like "Snapshot 2024-01-15 10:30:45"
     * const version = await versionsApi.snapshot('diagram-123');
     *
     * // Creates version with label like "Auto-save 2024-01-15 10:30:45"
     * const autoSave = await versionsApi.snapshot('diagram-123', 'Auto-save');
     */
    async snapshot(
      diagramId: string,
      prefix: string = 'Snapshot',
      options?: RequestOptions
    ): Promise<DiagramVersion> {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      return this.create(
        diagramId,
        { versionLabel: `${prefix} ${timestamp}` },
        options
      );
    },

    /**
     * Compare two versions by returning their sources.
     *
     * Useful for implementing diff views.
     *
     * @param diagramId - The parent diagram UUID.
     * @param versionId1 - The first version UUID.
     * @param versionId2 - The second version UUID.
     * @param options - Request options.
     * @returns Object containing both sources for comparison.
     *
     * @example
     * const { source1, source2, label1, label2 } = await versionsApi.compare(
     *   'diagram-123',
     *   'version-old',
     *   'version-new'
     * );
     * // Use a diff library to compare source1 and source2
     */
    async compare(
      diagramId: string,
      versionId1: string,
      versionId2: string,
      options?: RequestOptions
    ): Promise<{
      source1: string;
      source2: string;
      label1: string | null;
      label2: string | null;
      createdAt1: string;
      createdAt2: string;
    }> {
      const [v1, v2] = await Promise.all([
        this.get(diagramId, versionId1, options),
        this.get(diagramId, versionId2, options),
      ]);

      return {
        source1: v1.mermaidSource,
        source2: v2.mermaidSource,
        label1: v1.versionLabel,
        label2: v2.versionLabel,
        createdAt1: v1.createdAt,
        createdAt2: v2.createdAt,
      };
    },

    /**
     * Safely restore a version by first saving the current state.
     *
     * This is a common pattern: save current work, then restore.
     *
     * @param diagramId - The parent diagram UUID.
     * @param versionId - The version UUID to restore.
     * @param saveLabel - Label for the auto-saved version.
     * @param options - Request options.
     * @returns Object with the auto-saved version and restored diagram.
     *
     * @example
     * const { savedVersion, restoredDiagram } = await versionsApi.safeRestore(
     *   'diagram-123',
     *   'version-456',
     *   'Before restore'
     * );
     */
    async safeRestore(
      diagramId: string,
      versionId: string,
      saveLabel: string = 'Auto-save before restore',
      options?: RequestOptions
    ): Promise<{
      savedVersion: DiagramVersion;
      restoredDiagram: Diagram;
    }> {
      // Save current state first
      const savedVersion = await this.create(
        diagramId,
        { versionLabel: saveLabel },
        options
      );

      // Then restore
      const restoredDiagram = await this.restore(diagramId, versionId, options);

      return { savedVersion, restoredDiagram };
    },
  };
}

/**
 * Default versions API instance using the global API client.
 *
 * @example
 * import { versionsApi } from '@/lib/api/versions';
 *
 * const versions = await versionsApi.list('diagram-123');
 * await versionsApi.create('diagram-123', { versionLabel: 'v1.0' });
 * await versionsApi.restore('diagram-123', 'version-456');
 */
export const versionsApi = createVersionsApi();

/**
 * Re-export types for convenience.
 */
export type { DiagramVersion, CreateVersionRequest };
