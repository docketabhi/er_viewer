/**
 * usePresence Hook
 *
 * Manages user presence state for a diagram, including:
 * - WebSocket connection for real-time updates
 * - Current users list with status tracking
 * - Automatic join/leave on diagram change
 * - Connection state monitoring
 *
 * @module hooks/usePresence
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PresenceUser, PresenceStatus } from '@/components/TopBar/PresenceAvatars';
import {
  getWebSocketClient,
  type WebSocketClient,
  type ConnectionState,
  type PresenceUpdatePayload,
} from '@/lib/websocket';

// =====================
// TYPES
// =====================

/**
 * Current user information for presence.
 */
export interface CurrentUser {
  /** Unique user identifier */
  id: string;
  /** Display name */
  displayName: string;
  /** Optional avatar URL */
  avatarUrl?: string;
  /** Assigned color for cursor/highlights */
  color?: string;
}

/**
 * Options for usePresence hook.
 */
export interface UsePresenceOptions {
  /** Diagram ID to track presence for (null if no diagram open) */
  diagramId: string | null;
  /** Current user information */
  currentUser: CurrentUser | null;
  /** Whether the user is actively editing */
  isEditing?: boolean;
  /** Idle timeout in ms (default: 60000 - 1 minute) */
  idleTimeout?: number;
  /** Whether to auto-connect (default: true) */
  autoConnect?: boolean;
  /** Custom WebSocket client (optional, uses singleton by default) */
  wsClient?: WebSocketClient;
}

/**
 * Result from usePresence hook.
 */
export interface UsePresenceResult {
  /** List of users currently present in the diagram */
  users: PresenceUser[];
  /** Current WebSocket connection state */
  connectionState: ConnectionState;
  /** Whether connected to WebSocket */
  isConnected: boolean;
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Update current user's status */
  updateStatus: (status: PresenceStatus) => void;
  /** Current user (transformed to PresenceUser format) */
  currentUserPresence: PresenceUser | null;
}

// =====================
// CONSTANTS
// =====================

const DEFAULT_IDLE_TIMEOUT = 60000; // 1 minute
const ACTIVITY_DEBOUNCE = 1000; // 1 second

// =====================
// HOOK IMPLEMENTATION
// =====================

/**
 * Hook for managing user presence in a diagram.
 *
 * @example
 * ```tsx
 * const { users, isConnected, connectionState } = usePresence({
 *   diagramId: 'abc123',
 *   currentUser: { id: 'user1', displayName: 'Alice' },
 *   isEditing: true,
 * });
 * ```
 */
export function usePresence(options: UsePresenceOptions): UsePresenceResult {
  const {
    diagramId,
    currentUser,
    isEditing = false,
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    autoConnect = true,
    wsClient: providedWsClient,
  } = options;

  // Get or use provided WebSocket client
  const wsClientRef = useRef<WebSocketClient | null>(null);

  // State
  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('online');

  // Refs for tracking
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDiagramRef = useRef<string | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    if (typeof window === 'undefined') return;

    wsClientRef.current = providedWsClient ?? getWebSocketClient();

    // Subscribe to connection state changes
    const unsubscribe = wsClientRef.current.onConnectionChange(setConnectionState);

    // Auto-connect if enabled
    if (autoConnect && !wsClientRef.current.isConnected()) {
      wsClientRef.current.connect();
    }

    // Set initial connection state
    setConnectionState(wsClientRef.current.getConnectionState());

    return () => {
      unsubscribe();
    };
  }, [providedWsClient, autoConnect]);

  // Handle presence updates from server
  useEffect(() => {
    const wsClient = wsClientRef.current;
    if (!wsClient) return;

    const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
      // Only process updates for the current diagram
      if (payload.diagramId !== diagramId) return;

      setUsers((prev) => {
        const next = new Map(prev);

        if (payload.status === 'joined') {
          // Add or update user
          next.set(payload.userId, {
            id: payload.userId,
            name: payload.displayName ?? 'Anonymous',
            color: payload.color,
            status: 'online',
          });
        } else if (payload.status === 'left') {
          // Remove user
          next.delete(payload.userId);
        }

        return next;
      });
    };

    const unsubscribe = wsClient.onPresenceUpdate(handlePresenceUpdate);

    return () => {
      unsubscribe();
    };
  }, [diagramId]);

  // Join/leave diagram on diagramId change
  useEffect(() => {
    const wsClient = wsClientRef.current;
    if (!wsClient || !currentUser) return;

    const previousDiagram = previousDiagramRef.current;

    // Leave previous diagram if any
    if (previousDiagram && previousDiagram !== diagramId) {
      wsClient.leaveDiagram({
        diagramId: previousDiagram,
        userId: currentUser.id,
      });
      setUsers(new Map());
    }

    // Join new diagram
    if (diagramId && wsClient.isConnected()) {
      wsClient.joinDiagram({
        diagramId,
        userId: currentUser.id,
        displayName: currentUser.displayName,
        color: currentUser.color,
      });
    }

    previousDiagramRef.current = diagramId;

    // Cleanup: leave diagram when unmounting
    return () => {
      if (diagramId && wsClient.isConnected()) {
        wsClient.leaveDiagram({
          diagramId,
          userId: currentUser.id,
        });
      }
    };
  }, [diagramId, currentUser]);

  // Update status based on editing state
  useEffect(() => {
    if (isEditing) {
      setCurrentStatus('editing');
    } else {
      setCurrentStatus('online');
    }
  }, [isEditing]);

  // Idle detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();

      // If currently idle, go back to online
      if (currentStatus === 'idle') {
        setCurrentStatus(isEditing ? 'editing' : 'online');
      }

      // Reset idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        if (!isEditing) {
          setCurrentStatus('idle');
        }
      }, idleTimeout);
    };

    // Debounced activity handler
    let activityTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedActivity = () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityTimeout = setTimeout(handleActivity, ACTIVITY_DEBOUNCE);
    };

    // Listen for user activity
    window.addEventListener('mousemove', debouncedActivity);
    window.addEventListener('keydown', debouncedActivity);
    window.addEventListener('click', debouncedActivity);
    window.addEventListener('scroll', debouncedActivity);

    // Initial activity
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', debouncedActivity);
      window.removeEventListener('keydown', debouncedActivity);
      window.removeEventListener('click', debouncedActivity);
      window.removeEventListener('scroll', debouncedActivity);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [idleTimeout, isEditing, currentStatus]);

  // Connect function
  const connect = useCallback(() => {
    wsClientRef.current?.connect();
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    wsClientRef.current?.disconnect();
  }, []);

  // Update status manually
  const updateStatus = useCallback((status: PresenceStatus) => {
    setCurrentStatus(status);
  }, []);

  // Create current user presence object
  const currentUserPresence = useMemo<PresenceUser | null>(() => {
    if (!currentUser) return null;

    return {
      id: currentUser.id,
      name: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      color: currentUser.color,
      status: currentStatus,
    };
  }, [currentUser, currentStatus]);

  // Convert users Map to array
  const usersArray = useMemo(() => {
    const arr = Array.from(users.values());
    // Add current user if not in the list
    if (currentUserPresence && !users.has(currentUserPresence.id)) {
      arr.unshift(currentUserPresence);
    }
    return arr;
  }, [users, currentUserPresence]);

  return {
    users: usersArray,
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    updateStatus,
    currentUserPresence,
  };
}

/**
 * Generate a deterministic color based on a string (e.g., user ID).
 */
export function generateUserColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Generate a random user ID for anonymous users.
 */
export function generateAnonymousId(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a guest user for presence.
 */
export function createGuestUser(): CurrentUser {
  const id = generateAnonymousId();
  return {
    id,
    displayName: 'Guest',
    color: generateUserColor(id),
  };
}
