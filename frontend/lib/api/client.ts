/**
 * API Client with fetch wrapper and error handling.
 *
 * Provides a typed, configurable HTTP client for communicating with
 * the backend API. Features include:
 * - Request/response type safety
 * - Automatic JSON serialization/deserialization
 * - Request timeout support
 * - Error handling with typed error responses
 * - Auth token injection
 * - Request cancellation via AbortController
 *
 * @module lib/api/client
 */

import type {
  HttpMethod,
  RequestOptions,
  ApiClientConfig,
  ApiErrorResponse,
} from './types';

/**
 * Custom error class for API errors.
 * Includes status code and parsed error response from the server.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response: ApiErrorResponse | null;

  constructor(
    message: string,
    status: number,
    statusText: string,
    response: ApiErrorResponse | null = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if this is a specific HTTP status error.
   */
  isStatus(status: number): boolean {
    return this.status === status;
  }

  /**
   * Check if this is a client error (4xx).
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (5xx).
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if this is a not found error (404).
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Check if this is an unauthorized error (401).
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Check if this is a forbidden error (403).
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if this is a validation error (400/422).
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /**
   * Get validation error messages if this is a validation error.
   */
  getValidationMessages(): string[] {
    if (!this.isValidationError() || !this.response) {
      return [];
    }
    const message = this.response.message;
    return Array.isArray(message) ? message : [message];
  }
}

/**
 * Custom error class for network/connection errors.
 */
export class NetworkError extends Error {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * Custom error class for timeout errors.
 */
export class TimeoutError extends Error {
  public readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.timeout = timeout;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  defaultTimeout: 30000,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
};

/**
 * Creates an API client instance with the given configuration.
 */
export function createApiClient(config: ApiClientConfig) {
  const {
    baseUrl,
    defaultTimeout = DEFAULT_CONFIG.defaultTimeout!,
    defaultHeaders = DEFAULT_CONFIG.defaultHeaders,
    getAuthToken,
    onUnauthorized,
    onNetworkError,
  } = config;

  /**
   * Build the full URL with query parameters.
   */
  function buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    const url = new URL(normalizedEndpoint, baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Parse error response from the server.
   */
  async function parseErrorResponse(
    response: Response
  ): Promise<ApiErrorResponse | null> {
    try {
      const text = await response.text();
      if (!text) return null;
      return JSON.parse(text) as ApiErrorResponse;
    } catch {
      return null;
    }
  }

  /**
   * Create an error message from the response.
   */
  function createErrorMessage(
    status: number,
    statusText: string,
    errorResponse: ApiErrorResponse | null
  ): string {
    if (errorResponse?.message) {
      const msg = errorResponse.message;
      return Array.isArray(msg) ? msg.join(', ') : msg;
    }
    return `${status} ${statusText}`;
  }

  /**
   * Core request function with all features.
   */
  async function request<T>(
    method: HttpMethod,
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, headers: additionalHeaders, timeout, signal } = options;

    // Build URL with query params
    const url = buildUrl(endpoint, params);

    // Prepare headers
    const headers: Record<string, string> = {
      ...defaultHeaders,
      ...additionalHeaders,
    };

    // Add auth token if available
    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Create abort controller for timeout
    const abortController = new AbortController();
    const requestSignal = signal || abortController.signal;

    // Set up timeout
    const requestTimeout = timeout || defaultTimeout;
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, requestTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: requestSignal,
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorResponse = await parseErrorResponse(response);
        const message = createErrorMessage(
          response.status,
          response.statusText,
          errorResponse
        );

        // Handle unauthorized
        if (response.status === 401 && onUnauthorized) {
          onUnauthorized();
        }

        throw new ApiError(
          message,
          response.status,
          response.statusText,
          errorResponse
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse successful response
      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw our custom errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Check if it was our timeout or external abort
        if (signal?.aborted) {
          throw error; // External abort, re-throw
        }
        throw new TimeoutError(requestTimeout);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        const networkError = new NetworkError(
          'Network request failed. Please check your connection.',
          error
        );
        onNetworkError?.(networkError);
        throw networkError;
      }

      // Unknown error, wrap and re-throw
      throw new NetworkError(
        'An unexpected error occurred',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Return the client interface
  return {
    /**
     * Perform a GET request.
     */
    get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
      return request<T>('GET', endpoint, undefined, options);
    },

    /**
     * Perform a POST request.
     */
    post<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestOptions
    ): Promise<T> {
      return request<T>('POST', endpoint, body, options);
    },

    /**
     * Perform a PATCH request.
     */
    patch<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestOptions
    ): Promise<T> {
      return request<T>('PATCH', endpoint, body, options);
    },

    /**
     * Perform a PUT request.
     */
    put<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestOptions
    ): Promise<T> {
      return request<T>('PUT', endpoint, body, options);
    },

    /**
     * Perform a DELETE request.
     */
    delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
      return request<T>('DELETE', endpoint, undefined, options);
    },

    /**
     * The base URL for this client.
     */
    baseUrl,
  };
}

/**
 * Type for the API client returned by createApiClient.
 */
export type ApiClient = ReturnType<typeof createApiClient>;

// =====================
// DEFAULT CLIENT INSTANCE
// =====================

/**
 * Get the API base URL from environment variables.
 */
function getApiBaseUrl(): string {
  // Check for Next.js environment variable
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Check for browser window (for runtime configuration)
  if (typeof window !== 'undefined') {
    // Allow runtime configuration via window object
    const windowConfig = (window as unknown as { __API_CONFIG__?: { apiUrl: string } }).__API_CONFIG__;
    if (windowConfig?.apiUrl) {
      return windowConfig.apiUrl;
    }
  }

  // Default to localhost for development
  return 'http://localhost:3001';
}

/**
 * Default API client instance.
 *
 * Uses environment variables for configuration:
 * - NEXT_PUBLIC_API_URL: Base URL for the API
 *
 * @example
 * import { apiClient } from '@/lib/api/client';
 *
 * const diagrams = await apiClient.get<Diagram[]>('/diagrams');
 */
let _apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!_apiClient) {
    _apiClient = createApiClient({
      baseUrl: getApiBaseUrl(),
      defaultTimeout: 30000,
      onUnauthorized: () => {
        // Could dispatch an event or redirect to login
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:unauthorized'));
        }
      },
      onNetworkError: (error) => {
        // Could dispatch an event for global error handling
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('api:network-error', { detail: error })
          );
        }
      },
    });
  }
  return _apiClient;
}

/**
 * Default API client instance for convenience.
 * Note: This creates the client on first access, which is fine for most cases.
 * For SSR or testing, use createApiClient directly.
 */
export const apiClient = new Proxy({} as ApiClient, {
  get(_, prop) {
    return getApiClient()[prop as keyof ApiClient];
  },
});
