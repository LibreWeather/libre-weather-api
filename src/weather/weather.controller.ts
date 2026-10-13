import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { units } from '../utils';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  async byHeaders(
    @Res() res: Response,
    @Headers('x-unit') unit?: string,
    @Headers('x-latitude') lat?: string,
    @Headers('x-longitude') lon?: string,
    @Headers('x-tz') tz?: string
  ) {
    if (!this.weather.ready()) {
      return res.sendStatus(503);
    }
    return this.weather.getByLatLon(res, { lat, lon, unit: unit || 'DEFAULT', tz });
  }

  @Get(':coords/unit/:unit')
  async byCoordsUnit(
    @Res() res: Response,
    @Param('coords') coords: string,
    @Param('unit') unit: string,
    @Headers('x-tz') tz?: string
  ) {
    if (!this.weather.ready()) {
      return res.sendStatus(503);
    }
    const [lat, lon] = coords.split(',');
    return this.weather.getByLatLon(res, { lat, lon, unit, tz });
  }

  @Get(':coords')
  async byCoords(@Res() res: Response, @Param('coords') coords: string, @Headers('x-tz') tz?: string) {
    if (!this.weather.ready()) {
      return res.sendStatus(503);
    }
    const [lat, lon] = coords.split(',');
    return this.weather.getByLatLon(res, { lat, lon, unit: units.DEFAULT, tz });
  }
}
