import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { backends, logger, units } from '../utils';
import OpenWeatherMap from '../backend/OpenWeatherMap';
import OpenMeteo from '../backend/OpenMeteo';
import type Backend from '../backend/Backend';
import type { BackendOptions } from '../backend/Backend';

@Injectable()
export class WeatherService {
  #backend: Backend | null = null;

  constructor() {
    switch (process.env.BACKEND) {
      case backends.OWM:
        this.#backend = new OpenWeatherMap();
        break;
      case backends.METEO:
        this.#backend = new OpenMeteo();
        break;
      default:
        break;
    }
  }

  ready() {
    return Boolean(this.#backend);
  }

  async getByLatLon(res: Response, options: BackendOptions) {
    const { lat, lon, unit, tz } = options;
    if (!lat || !lon) {
      return res.json({
        error: 'Bad request, either latitude and longitude or weather location code are required.',
        code: 400,
      });
    }

    const data = await this.#backend!.fetch(res, { lat, lon, unit, tz });
    if (data) {
      try {
        return res.json(this.#backend!.serialize(data, unit || units.DEFAULT)).end();
      } catch (e) {
        logger.debug(e);
        logger.debug((e as Error).stack);
        return res.sendStatus(500).end();
      }
    }
    return res.sendStatus(400).end();
  }
}
