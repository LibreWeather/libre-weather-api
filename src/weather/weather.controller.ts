import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { isWeatherSlice } from '../backend/Backend';
import { units } from '../utils';
import { WeatherService } from './weather.service';

const backendRequest = (res: Response, name?: string) => ({
  name,
  key: typeof res.locals.backendKey === 'string' ? res.locals.backendKey : undefined,
});

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get()
  async byHeaders(
    @Res() res: Response,
    @Headers('x-unit') unit?: string,
    @Headers('x-latitude') lat?: string,
    @Headers('x-longitude') lon?: string,
    @Headers('x-tz') tz?: string,
    @Headers('x-backend') backend?: string
  ) {
    if (!this.weather.ready()) return res.sendStatus(503);
    return this.weather.getByLatLon(res, { lat, lon, unit: unit || 'DEFAULT', tz }, backendRequest(res, backend));
  }

  @Get(':coords/unit/:unit')
  async byCoordsUnit(
    @Res() res: Response,
    @Param('coords') coords: string,
    @Param('unit') unit: string,
    @Headers('x-tz') tz?: string,
    @Headers('x-backend') backend?: string
  ) {
    if (!this.weather.ready()) return res.sendStatus(503);
    const [lat, lon] = coords.split(',');
    return this.weather.getByLatLon(res, { lat, lon, unit, tz }, backendRequest(res, backend));
  }

  @Get(':coords/unit/:unit/:part')
  async bySlice(
    @Res() res: Response,
    @Param('coords') coords: string,
    @Param('unit') unit: string,
    @Param('part') part: string,
    @Headers('x-tz') tz?: string,
    @Headers('x-backend') backend?: string
  ) {
    if (!this.weather.ready()) return res.sendStatus(503);
    if (!isWeatherSlice(part)) return res.sendStatus(404);
    const [lat, lon] = coords.split(',');
    return this.weather.getByLatLon(res, { lat, lon, unit, tz, part }, backendRequest(res, backend));
  }

  @Get(':coords')
  async byCoords(
    @Res() res: Response,
    @Param('coords') coords: string,
    @Headers('x-tz') tz?: string,
    @Headers('x-backend') backend?: string
  ) {
    if (!this.weather.ready()) return res.sendStatus(503);
    const [lat, lon] = coords.split(',');
    return this.weather.getByLatLon(res, { lat, lon, unit: units.DEFAULT, tz }, backendRequest(res, backend));
  }
}
