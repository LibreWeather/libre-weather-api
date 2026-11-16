import { strict as assert } from 'node:assert';
import type { Response } from 'express';

import { chooseBackend } from '../src/weather/backendChoice';
import { WeatherService } from '../src/weather/weather.service';
import { Condition } from '../src/types';

const saved = {
  BACKEND: process.env.BACKEND,
  OWM_KEY: process.env.OWM_KEY,
  PIRATE_WEATHER_KEY: process.env.PIRATE_WEATHER_KEY,
};

const restore = (name: 'BACKEND' | 'OWM_KEY' | 'PIRATE_WEATHER_KEY') => {
  const value = saved[name];
  if (value == null) delete process.env[name];
  else process.env[name] = value;
};

const resetEnv = () => {
  restore('BACKEND');
  restore('OWM_KEY');
  restore('PIRATE_WEATHER_KEY');
};

describe('chooseBackend', () => {
  afterEach(resetEnv);

  it('uses the configured backend when the request does not name one', () => {
    process.env.BACKEND = 'METEO';
    assert.deepEqual(chooseBackend(undefined, undefined), { backend: 'METEO', key: '', rejected: false });
  });

  it('keeps a bad key for the configured backend on that backend env key', () => {
    process.env.BACKEND = 'OWM';
    process.env.OWM_KEY = 'server-owm';
    assert.deepEqual(chooseBackend('OWM', 'bad key'), { backend: 'OWM', key: 'server-owm', rejected: false });
    assert.deepEqual(chooseBackend(undefined, 'bad key'), { backend: 'OWM', key: 'server-owm', rejected: false });
  });

  it('selects Pirate or OpenWeatherMap from a usable key and ignores a key for Open-Meteo', () => {
    process.env.BACKEND = 'METEO';
    assert.deepEqual(chooseBackend('PIRATE', 'pw-key'), { backend: 'PIRATE', key: 'pw-key', rejected: false });
    assert.deepEqual(chooseBackend('OWM', 'owm-key'), { backend: 'OWM', key: 'owm-key', rejected: false });
    assert.deepEqual(chooseBackend('METEO', 'ignored'), { backend: 'METEO', key: '', rejected: false });
  });

  it('falls back to the configured backend for an unknown name, a bad key, or a missing key', () => {
    process.env.BACKEND = 'METEO';
    process.env.OWM_KEY = '';
    assert.equal(chooseBackend('NOPE', undefined)?.backend, 'METEO');
    assert.equal(chooseBackend('NOPE', undefined)?.rejected, true);
    assert.equal(chooseBackend('PIRATE', 'bad key')?.backend, 'METEO');
    assert.equal(chooseBackend('OWM', undefined)?.backend, 'METEO');
    assert.equal(chooseBackend('PIRATE', 'bad key')?.backend, chooseBackend(undefined, undefined)?.backend);
  });
});

const meteoBody = {
  utc_offset_seconds: 0,
  current_weather: { temperature: 1, windspeed: 1, winddirection: 1, weathercode: 1 },
  hourly: { time: ['2026-01-01T12:00'] },
  daily: { sunrise: ['2026-01-01T07:00'], sunset: ['2026-01-01T17:00'] },
};

const pirateBody = {
  currently: {
    time: 1_700_000_000,
    summary: 'Light rain',
    icon: 'rain',
    temperature: 12,
    apparentTemperature: 10,
    dewPoint: 8,
    humidity: 0.5,
    pressure: 1000,
    precipIntensity: 1,
    windSpeed: 1,
    windBearing: 1,
    visibility: 10,
  },
  daily: { data: [{ sunriseTime: 1, sunsetTime: 2 }] },
};

const mockRes = () => {
  const headers: Record<string, string> = {};
  const res = {
    locals: {} as Record<string, unknown>,
    status: 200,
    body: undefined as unknown,
    set(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
    sendStatus(code: number) {
      this.status = code;
      return this;
    },
    headers,
  };
  return res;
};

describe('WeatherService backend fallback', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
    resetEnv();
  });

  it('names Pirate when that override succeeds', async () => {
    process.env.BACKEND = 'METEO';
    const urls: string[] = [];
    global.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(pirateBody), { status: 200 });
    };
    const res = mockRes();
    await new WeatherService().getByLatLon(res as unknown as Response, {
      lat: '1',
      lon: '2',
      unit: 'METRIC',
      part: 'current',
    }, { name: 'PIRATE', key: 'pw-key' });
    assert.equal(res.headers['x-backend'], 'PIRATE');
    assert.equal(res.locals.skipCache, undefined);
    assert.equal((res.body as { current: { condition: string } }).current.condition, Condition.LIGHT_RAIN);
    assert.ok(urls.every((url) => url.includes('pirateweather')));
    assert.ok(urls[0].includes('pw-key'));
  });

  it('falls back to the configured backend when the override fetch fails and skips that cache entry', async () => {
    process.env.BACKEND = 'METEO';
    const urls: string[] = [];
    global.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes('pirateweather')) return new Response('no', { status: 401 });
      return new Response(JSON.stringify(meteoBody), { status: 200 });
    };
    const res = mockRes();
    await new WeatherService().getByLatLon(res as unknown as Response, {
      lat: '1',
      lon: '2',
      unit: 'METRIC',
      part: 'current',
    }, { name: 'PIRATE', key: 'pw-key' });
    assert.equal(res.headers['x-backend'], 'METEO');
    assert.equal(res.locals.skipCache, true);
    assert.ok(urls.some((url) => url.includes('pirateweather')));
    assert.ok(urls.some((url) => url.includes('open-meteo')));
    assert.ok(res.body);
  });

  it('serves the configured backend for an unknown name without calling the override', async () => {
    process.env.BACKEND = 'METEO';
    const urls: string[] = [];
    global.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(meteoBody), { status: 200 });
    };
    const res = mockRes();
    await new WeatherService().getByLatLon(res as unknown as Response, {
      lat: '1',
      lon: '2',
      unit: 'METRIC',
      part: 'current',
    }, { name: 'NOPE', key: 'bad key' });
    assert.equal(res.headers['x-backend'], 'METEO');
    assert.equal(res.locals.skipCache, undefined);
    assert.ok(urls.every((url) => url.includes('open-meteo')));
  });
});
