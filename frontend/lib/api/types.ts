/**
 * Type definitions for API client.
 *
 * Defines request/response types mirroring the backend DTOs
 * and common API utilities like error handling.
 *
 * @module lib/api/types
 */

// =====================
// DIAGRAM TYPES
// =====================

/**
 * Diagram type options for creation and filtering.
 */
export type DiagramType =
  | 'erDiagram'
  | 'flowchart'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'gantt'
  | 'pie'
  | 'mindmap';

/**
 * Mermaid theme options.
 */
export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';

/**
 * Diagram entity returned from the API.
 */
export interface Diagram {
  id: string;
  title: string;
  type: DiagramType;
  mermaidSource: string;
  theme: MermaidTheme | null;
  createdBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a new diagram.
 */
export interface CreateDiagramRequest {
  title: string;
  mermaidSource: string;
  type?: DiagramType;
  theme?: MermaidTheme;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request body for updating an existing diagram.
 */
export interface UpdateDiagramRequest {
  title?: string;
  mermaidSource?: string;
  type?: DiagramType;
  theme?: MermaidTheme;
  metadata?: Record<string, unknown>;
}

/**
 * Query parameters for listing diagrams.
 */
export interface ListDiagramsQuery {
  type?: DiagramType;
  createdBy?: string;
}

// =====================
// VERSION TYPES
// =====================

/**
 * Diagram version entity returned from the API.
 */
export interface DiagramVersion {
  id: string;
  diagramId: string;
  mermaidSource: string;
  versionLabel: string | null;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Request body for creating a new version snapshot.
 */
export interface CreateVersionRequest {
  versionLabel?: string;
  createdBy?: string;
}

// =====================
// BLOCK TYPES
// =====================

/**
 * Diagram block entity returned from the API.
 * Represents a link from an entity in a parent diagram to a child diagram.
 */
export interface DiagramBlock {
  id: string;
  parentDiagramId: string;
  parentEntityKey: string;
  childDiagramId: string;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Request body for creating a new block.
 */
export interface CreateBlockRequest {
  parentEntityKey: string;
  childDiagramId: string;
  label?: string;
  createdBy?: string;
}

/**
 * Request body for updating an existing block.
 */
export interface UpdateBlockRequest {
  childDiagramId?: string;
  label?: string;
}

// =====================
// API RESPONSE TYPES
// =====================

/**
 * Standard delete response.
 */
export interface DeleteResponse {
  deleted: boolean;
  id: string;
}

/**
 * API error response from the backend.
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// =====================
// CLIENT TYPES
// =====================

/**
 * HTTP methods supported by the API client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Options for API requests.
 */
export interface RequestOptions {
  /**
   * Query parameters to append to the URL.
   */
  params?: Record<string, string | number | boolean | undefined>;

  /**
   * Additional headers to include.
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds.
   * Defaults to 30000 (30 seconds).
   */
  timeout?: number;

  /**
   * AbortSignal for request cancellation.
   */
  signal?: AbortSignal;
}

/**
 * Configuration for the API client.
 */
export interface ApiClientConfig {
  /**
   * Base URL for the API (e.g., 'http://localhost:3001').
   */
  baseUrl: string;

  /**
   * Default timeout for requests in milliseconds.
   */
  defaultTimeout?: number;

  /**
   * Default headers to include with every request.
   */
  defaultHeaders?: Record<string, string>;

  /**
   * Function to get the current auth token.
   * Called before each request if provided.
   */
  getAuthToken?: () => string | null | Promise<string | null>;

  /**
   * Callback for handling 401 unauthorized responses.
   */
  onUnauthorized?: () => void;

  /**
   * Callback for handling network errors.
   */
  onNetworkError?: (error: Error) => void;
}
