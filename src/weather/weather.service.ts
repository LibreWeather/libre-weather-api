import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { logger, units } from '../utils';
import OpenWeatherMap from '../backend/OpenWeatherMap';
import OpenMeteo from '../backend/OpenMeteo';
import PirateWeather from '../backend/PirateWeather';
import type Backend from '../backend/Backend';
import type { BackendOptions, WeatherPart } from '../backend/Backend';
import { BackendId, chooseBackend, configuredBackend, envKey } from './backendChoice';

export type BackendRequest = {
  name?: string;
  key?: string;
};

@Injectable()
export class WeatherService {
  #owm = new OpenWeatherMap();
  #meteo = new OpenMeteo();
  #pirate = new PirateWeather();

  ready() {
    return configuredBackend() != null;
  }

  #instance(backend: BackendId): Backend {
    if (backend === BackendId.OWM) return this.#owm;
    if (backend === BackendId.PIRATE) return this.#pirate;
    return this.#meteo;
  }

  async #attempt(backend: BackendId, key: string, options: BackendOptions, unit: string, part: WeatherPart) {
    try {
      const data = await this.#instance(backend).fetch({} as Response, { ...options, key });
      if (!data || typeof data !== 'object') return null;
      return this.#instance(backend).serialize(data, unit, part);
    } catch (error) {
      logger.debug(error);
      return null;
    }
  }

  async getByLatLon(res: Response, options: BackendOptions, request: BackendRequest = {}) {
    const { lat, lon, unit, tz } = options;
    if (!lat || !lon) {
      return res.json({
        error: 'Bad request, either latitude and longitude or weather location code are required.',
        code: 400,
      });
    }

    const choice = chooseBackend(request.name, request.key);
    const configured = configuredBackend();
    if (!choice || !configured) return res.sendStatus(503).end();

    const resolvedUnit = unit || units.DEFAULT;
    const part = options.part || 'all';
    const fetchOptions = { lat, lon, unit: resolvedUnit, tz, part };
    let served = choice.backend;
    let body = await this.#attempt(choice.backend, choice.key, fetchOptions, resolvedUnit, part);

    if (!body && served !== configured) {
      res.locals.skipCache = true;
      body = await this.#attempt(configured, envKey(configured), fetchOptions, resolvedUnit, part);
      served = configured;
    }

    if (!body) return res.sendStatus(400).end();

    res.set('x-backend', served);
    return res.json(body).end();
  }
}
