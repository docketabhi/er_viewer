/**
 * WebSocket client module.
 *
 * Provides real-time communication with the backend via Socket.io.
 *
 * @module lib/websocket
 */

export {
  WebSocketClient,
  getWebSocketClient,
  createWebSocketClient,
  type WebSocketClientConfig,
  type ConnectionState,
  type EventHandler,
  type PresenceUpdatePayload,
  type CursorUpdatePayload,
  type DiagramChangePayload,
  type JoinDiagramPayload,
  type LeaveDiagramPayload,
  type CursorMovePayload,
  type NotifyDiagramChangePayload,
} from './client';
