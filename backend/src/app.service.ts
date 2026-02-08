import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Returns health check status
   * Used by Docker health checks and monitoring systems
   */
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Returns API information
   * Provides overview of available endpoints
   */
  getApiInfo(): {
    name: string;
    version: string;
    description: string;
    endpoints: { health: string; diagrams: string; websocket: string };
  } {
    return {
      name: 'ER Viewer API',
      version: '1.0.0',
      description: 'Backend API for ER Viewer - Mermaid Diagramming Tool with Nested ER Blocks',
      endpoints: {
        health: 'GET /health',
        diagrams: 'GET /api/diagrams (coming soon)',
        websocket: 'ws://localhost:3001 (coming soon)',
      },
    };
  }
}
