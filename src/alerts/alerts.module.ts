import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [{ provide: AlertsService, useFactory: () => new AlertsService() }],
})
export class AlertsModule {}
