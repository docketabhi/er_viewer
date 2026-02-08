/**
 * WebSocket Client
 *
 * Provides a Socket.io-based WebSocket client for real-time communication
 * with the backend. Features include:
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Event subscription/unsubscription
 * - Typed event payloads
 *
 * @module lib/websocket/client
 */

import { io, Socket } from 'socket.io-client';

// =====================
// TYPES
// =====================

/**
 * Presence update payload from server.
 */
export interface PresenceUpdatePayload {
  userId: string;
  diagramId: string;
  displayName?: string;
  color?: string;
  status: 'joined' | 'left';
}

/**
 * Cursor update payload from server.
 */
export interface CursorUpdatePayload {
  userId: string;
  diagramId: string;
  position: {
    x: number;
    y: number;
  };
}

/**
 * Diagram change payload from server.
 */
export interface DiagramChangePayload {
  userId: string;
  diagramId: string;
  changeType: 'content' | 'title' | 'metadata';
}

/**
 * Join diagram payload to send to server.
 */
export interface JoinDiagramPayload {
  diagramId: string;
  userId?: string;
  displayName?: string;
  color?: string;
}

/**
 * Leave diagram payload to send to server.
 */
export interface LeaveDiagramPayload {
  diagramId: string;
  userId?: string;
}

/**
 * Cursor move payload to send to server.
 */
export interface CursorMovePayload {
  diagramId: string;
  position: {
    x: number;
    y: number;
  };
  userId?: string;
}

/**
 * Diagram change notification payload to send to server.
 */
export interface NotifyDiagramChangePayload {
  diagramId: string;
  changeType: 'content' | 'title' | 'metadata';
  userId?: string;
}

/**
 * WebSocket connection state.
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Event handler type.
 */
export type EventHandler<T> = (payload: T) => void;

/**
 * WebSocket client configuration.
 */
export interface WebSocketClientConfig {
  /** Server URL (defaults to NEXT_PUBLIC_WS_URL or localhost:3001) */
  url?: string;
  /** Whether to auto-connect on creation (default: false) */
  autoConnect?: boolean;
  /** Reconnection attempts (default: 5) */
  reconnectionAttempts?: number;
  /** Reconnection delay in ms (default: 1000) */
  reconnectionDelay?: number;
  /** Reconnection delay max in ms (default: 5000) */
  reconnectionDelayMax?: number;
  /** Connection timeout in ms (default: 20000) */
  timeout?: number;
}

// =====================
// WebSocket CLIENT CLASS
// =====================

/**
 * WebSocket client class for real-time communication.
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private config: Required<WebSocketClientConfig>;
  private connectionState: ConnectionState = 'disconnected';
  private connectionListeners: Set<EventHandler<ConnectionState>> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: WebSocketClientConfig = {}) {
    this.config = {
      url: config.url || this.getDefaultUrl(),
      autoConnect: config.autoConnect ?? false,
      reconnectionAttempts: config.reconnectionAttempts ?? 5,
      reconnectionDelay: config.reconnectionDelay ?? 1000,
      reconnectionDelayMax: config.reconnectionDelayMax ?? 5000,
      timeout: config.timeout ?? 20000,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Get the default WebSocket URL from environment variables.
   */
  private getDefaultUrl(): string {
    // Check for Next.js environment variable
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }

    // Check for browser window (for runtime configuration)
    if (typeof window !== 'undefined') {
      const windowConfig = (
        window as unknown as { __API_CONFIG__?: { wsUrl: string } }
      ).__API_CONFIG__;
      if (windowConfig?.wsUrl) {
        return windowConfig.wsUrl;
      }
    }

    // Default to localhost for development
    return 'http://localhost:3001';
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.setConnectionState('connecting');

    this.socket = io(this.config.url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Set up internal event listeners for connection management.
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.setConnectionState('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.setConnectionState('disconnected');

      // Attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, this.config.reconnectionDelay);
      }
    });

    this.socket.on('connect_error', () => {
      this.setConnectionState('error');
    });

    this.socket.on('reconnect', () => {
      this.setConnectionState('connected');
    });

    this.socket.on('reconnect_error', () => {
      this.setConnectionState('error');
    });
  }

  /**
   * Update connection state and notify listeners.
   */
  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }

  /**
   * Get current connection state.
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to connection state changes.
   */
  onConnectionChange(handler: EventHandler<ConnectionState>): () => void {
    this.connectionListeners.add(handler);
    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(handler);
    };
  }

  // =====================
  // DIAGRAM EVENTS
  // =====================

  /**
   * Join a diagram room to receive updates.
   */
  joinDiagram(payload: JoinDiagramPayload): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('join-diagram', payload);
  }

  /**
   * Leave a diagram room.
   */
  leaveDiagram(payload: LeaveDiagramPayload): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('leave-diagram', payload);
  }

  /**
   * Send cursor position update.
   */
  moveCursor(payload: CursorMovePayload): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('cursor-move', payload);
  }

  /**
   * Notify of diagram content change.
   */
  notifyDiagramChange(payload: NotifyDiagramChangePayload): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('diagram-change', payload);
  }

  // =====================
  // EVENT SUBSCRIPTIONS
  // =====================

  /**
   * Subscribe to presence updates.
   */
  onPresenceUpdate(handler: EventHandler<PresenceUpdatePayload>): () => void {
    if (!this.socket) {
      return () => {};
    }
    this.socket.on('presence-update', handler);
    return () => {
      this.socket?.off('presence-update', handler);
    };
  }

  /**
   * Subscribe to cursor updates.
   */
  onCursorUpdate(handler: EventHandler<CursorUpdatePayload>): () => void {
    if (!this.socket) {
      return () => {};
    }
    this.socket.on('cursor-update', handler);
    return () => {
      this.socket?.off('cursor-update', handler);
    };
  }

  /**
   * Subscribe to diagram change notifications.
   */
  onDiagramChanged(handler: EventHandler<DiagramChangePayload>): () => void {
    if (!this.socket) {
      return () => {};
    }
    this.socket.on('diagram-changed', handler);
    return () => {
      this.socket?.off('diagram-changed', handler);
    };
  }

  /**
   * Get the socket ID (client identifier).
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// =====================
// SINGLETON INSTANCE
// =====================

let _wsClient: WebSocketClient | null = null;

/**
 * Get the singleton WebSocket client instance.
 */
export function getWebSocketClient(): WebSocketClient {
  if (!_wsClient) {
    _wsClient = new WebSocketClient();
  }
  return _wsClient;
}

/**
 * Create a new WebSocket client with custom configuration.
 */
export function createWebSocketClient(
  config?: WebSocketClientConfig
): WebSocketClient {
  return new WebSocketClient(config);
}
