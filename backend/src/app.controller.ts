import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint - excluded from /api prefix
   * Used for monitoring and container health checks
   */
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  /**
   * Root API endpoint - provides API information
   */
  @Get()
  getApiInfo(): {
    name: string;
    version: string;
    description: string;
    endpoints: { health: string; diagrams: string; websocket: string };
  } {
    return this.appService.getApiInfo();
  }
}
