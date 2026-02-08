/**
 * Gateways Module
 *
 * NestJS module for WebSocket gateways.
 * Provides real-time communication capabilities for the application.
 *
 * Note: WebSocket gateways must be registered in module providers, not controllers.
 */

import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class GatewaysModule {}
