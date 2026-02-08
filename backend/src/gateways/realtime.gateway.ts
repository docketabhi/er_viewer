/**
 * Realtime Gateway
 *
 * WebSocket gateway for real-time diagram presence and events.
 * Uses Socket.io for WebSocket communication.
 *
 * Room-based organization:
 * - Each diagram has its own room: `diagram:{diagramId}`
 * - Clients join rooms to receive diagram-specific events
 *
 * Events:
 * - join-diagram: Client joins a diagram room
 * - leave-diagram: Client leaves a diagram room
 * - cursor-move: Client cursor position update
 * - presence-update: Broadcast when users join/leave
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface PresencePayload {
  diagramId: string;
  userId?: string;
  displayName?: string;
  color?: string;
}

interface CursorPayload {
  diagramId: string;
  position: {
    x: number;
    y: number;
  };
  userId?: string;
}

interface DiagramChangePayload {
  diagramId: string;
  changeType: 'content' | 'title' | 'metadata';
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  /**
   * Track which diagrams each client is in for cleanup on disconnect
   */
  private clientDiagrams: Map<string, Set<string>> = new Map();

  /**
   * Handle new client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientDiagrams.set(client.id, new Set());
  }

  /**
   * Handle client disconnection
   * Clean up presence in all diagrams the client was viewing
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Notify all diagrams this client was viewing
    const diagrams = this.clientDiagrams.get(client.id);
    if (diagrams) {
      diagrams.forEach((diagramId) => {
        this.server.to(`diagram:${diagramId}`).emit('presence-update', {
          userId: client.id,
          diagramId,
          status: 'left',
        });
      });
    }

    // Clean up tracking
    this.clientDiagrams.delete(client.id);
  }

  /**
   * Handle client joining a diagram room
   * Clients join rooms to receive diagram-specific events
   */
  @SubscribeMessage('join-diagram')
  handleJoinDiagram(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresencePayload,
  ): void {
    const { diagramId, userId, displayName, color } = payload;
    const roomName = `diagram:${diagramId}`;

    // Join the Socket.io room
    client.join(roomName);

    // Track this client's diagram membership
    const diagrams = this.clientDiagrams.get(client.id);
    if (diagrams) {
      diagrams.add(diagramId);
    }

    this.logger.log(`Client ${client.id} joined diagram: ${diagramId}`);

    // Broadcast presence update to room
    this.server.to(roomName).emit('presence-update', {
      userId: userId ?? client.id,
      diagramId,
      displayName: displayName ?? 'Anonymous',
      color: color ?? this.generateColor(client.id),
      status: 'joined',
    });
  }

  /**
   * Handle client leaving a diagram room
   */
  @SubscribeMessage('leave-diagram')
  handleLeaveDiagram(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresencePayload,
  ): void {
    const { diagramId, userId } = payload;
    const roomName = `diagram:${diagramId}`;

    // Leave the Socket.io room
    client.leave(roomName);

    // Remove from tracking
    const diagrams = this.clientDiagrams.get(client.id);
    if (diagrams) {
      diagrams.delete(diagramId);
    }

    this.logger.log(`Client ${client.id} left diagram: ${diagramId}`);

    // Broadcast presence update to room
    this.server.to(roomName).emit('presence-update', {
      userId: userId ?? client.id,
      diagramId,
      status: 'left',
    });
  }

  /**
   * Handle cursor position updates for collaborative editing
   */
  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CursorPayload,
  ): void {
    const { diagramId, position, userId } = payload;
    const roomName = `diagram:${diagramId}`;

    // Broadcast cursor position to other clients in the room
    client.to(roomName).emit('cursor-update', {
      userId: userId ?? client.id,
      diagramId,
      position,
    });
  }

  /**
   * Handle diagram content change notifications
   * Used to signal other clients that the diagram has been updated
   */
  @SubscribeMessage('diagram-change')
  handleDiagramChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DiagramChangePayload,
  ): void {
    const { diagramId, changeType, userId } = payload;
    const roomName = `diagram:${diagramId}`;

    // Broadcast change notification to other clients
    client.to(roomName).emit('diagram-changed', {
      userId: userId ?? client.id,
      diagramId,
      changeType,
    });
  }

  /**
   * Generate a consistent color for a user based on their client ID
   */
  private generateColor(clientId: string): string {
    // Generate a hash from the client ID
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert to a hue value (0-360)
    const hue = Math.abs(hash % 360);

    // Return an HSL color with good saturation and lightness
    return `hsl(${hue}, 70%, 50%)`;
  }
}
