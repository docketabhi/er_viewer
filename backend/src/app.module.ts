import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DiagramsModule } from './modules/diagrams/diagrams.module';

@Module({
  imports: [
    // Load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Diagram CRUD module
    DiagramsModule,
    // Additional modules will be added here:
    // - GatewaysModule (Phase 4)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
