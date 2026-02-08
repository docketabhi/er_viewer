import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Additional modules will be added here:
    // - DiagramsModule (Phase 3)
    // - GatewaysModule (Phase 4)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
