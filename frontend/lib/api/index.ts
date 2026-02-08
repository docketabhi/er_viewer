/**
 * API Client module exports.
 *
 * Provides a complete typed API client for the ER Viewer backend.
 *
 * @module lib/api
 *
 * @example
 * // Import the default instances
 * import { diagramsApi, versionsApi, blocksApi } from '@/lib/api';
 *
 * // Or import the client for custom configuration
 * import { createApiClient, createDiagramsApi } from '@/lib/api';
 *
 * @example
 * // Using default instances
 * const diagrams = await diagramsApi.list();
 * const diagram = await diagramsApi.get('abc-123');
 *
 * const versions = await versionsApi.list('abc-123');
 * const blocks = await blocksApi.list('abc-123');
 *
 * @example
 * // Custom client configuration
 * import { createApiClient, createDiagramsApi } from '@/lib/api';
 *
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   getAuthToken: () => localStorage.getItem('token'),
 * });
 *
 * const diagramsApi = createDiagramsApi(client);
 */

// =====================
// CLIENT EXPORTS
// =====================

export {
  createApiClient,
  getApiClient,
  apiClient,
  ApiError,
  NetworkError,
  TimeoutError,
  type ApiClient,
} from './client';

// =====================
// API MODULE EXPORTS
// =====================

export {
  createDiagramsApi,
  diagramsApi,
} from './diagrams';

export {
  createVersionsApi,
  versionsApi,
} from './versions';

export {
  createBlocksApi,
  blocksApi,
} from './blocks';

// =====================
// TYPE EXPORTS
// =====================

export type {
  // Diagram types
  Diagram,
  DiagramType,
  MermaidTheme,
  CreateDiagramRequest,
  UpdateDiagramRequest,
  ListDiagramsQuery,

  // Version types
  DiagramVersion,
  CreateVersionRequest,

  // Block types
  DiagramBlock,
  CreateBlockRequest,
  UpdateBlockRequest,

  // Common types
  DeleteResponse,
  ApiErrorResponse,
  HttpMethod,
  RequestOptions,
  ApiClientConfig,
} from './types';
