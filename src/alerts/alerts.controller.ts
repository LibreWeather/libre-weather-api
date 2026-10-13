import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { logger } from '../utils';
import { AlertsService, AlertsUnavailableError } from './alerts.service';

const parseCoords = (coords: string) => {
  const [lat, lon] = coords.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }
  return { lat, lon };
};

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get(':coords')
  async byCoords(@Res() res: Response, @Param('coords') coords: string) {
    const point = parseCoords(coords);
    if (!point) {
      return res.status(400).json({ error: 'Bad request, expected /alerts/{lat},{lon}.', code: 400 });
    }
    try {
      const body = await this.alerts.forPoint(point.lat, point.lon);
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(body);
    } catch (error) {
      if (error instanceof AlertsUnavailableError) {
        return res.status(502).json({ error: 'Alert providers are unavailable.', code: 502 });
      }
      logger.error(error);
      return res.sendStatus(500);
    }
  }
}
