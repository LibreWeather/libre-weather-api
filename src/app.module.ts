import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [WeatherModule, AlertsModule],
})
export class AppModule {}
