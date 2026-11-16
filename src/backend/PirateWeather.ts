import Volume from '../utils/volume';
import WindSpeed from '../utils/windspeed';
import Temperature from '../utils/temp';
import { Condition, PressureUnit, UnitSystem, VisibilityUnit } from '../types';
import Backend from './Backend';
import type { BackendOptions, WeatherPart } from './Backend';
import type { Response } from 'express';

const ROOT = 'https://api.pirateweather.net/forecast';

/** Light rain is below 2.5 mm/h, which is 0.1 in/h. */
const LIGHT_MM_PER_HOUR = 2.5;
const LIGHT_IN_PER_HOUR = 0.1;

const ICONS: Record<string, Condition> = {
  'clear-day': Condition.CLEAR,
  'clear-night': Condition.CLEAR,
  'mostly-clear-day': Condition.CLEAR,
  'mostly-clear-night': Condition.CLEAR,
  'partly-cloudy-day': Condition.PARTLY_CLOUDY,
  'partly-cloudy-night': Condition.PARTLY_CLOUDY,
  cloudy: Condition.CLOUDY,
  'mostly-cloudy-day': Condition.CLOUDY,
  'mostly-cloudy-night': Condition.CLOUDY,
  fog: Condition.FOG,
  thunderstorm: Condition.RAIN,
  'possible-rain-day': Condition.RAIN,
  'possible-rain-night': Condition.RAIN,
  snow: Condition.SNOW,
  sleet: Condition.SLEET,
  hail: Condition.SLEET,
  ice: Condition.SLEET,
  mixed: Condition.SLEET,
  wind: Condition.WIND,
};

const imperial = (unit: string) => unit === UnitSystem.IMPERIAL;

const num = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const percent = (fraction: unknown) => {
  const n = Number(fraction);
  return Number.isFinite(n) ? n * 100 : 0;
};

const text = (value: unknown) => (typeof value === 'string' ? value : '');

const finite = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const unixMillis = (seconds: unknown) => {
  const n = Number(seconds);
  return Number.isFinite(n) ? n * 1000 : 0;
};

const block = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const list = (value: unknown) => (Array.isArray(value) ? value : []);

/**
 * Rain below the light-rain rate is `LIGHT_RAIN`. A missing rate stays `RAIN`,
 * and thunderstorms and possible rain never count as light.
 */
const conditionFor = (icon: unknown, intensity: unknown, unit: string) => {
  if (String(icon) === 'rain') {
    const rate = Number(intensity);
    const limit = imperial(unit) ? LIGHT_IN_PER_HOUR : LIGHT_MM_PER_HOUR;
    if (Number.isFinite(rate) && rate > 0 && rate < limit) return Condition.LIGHT_RAIN;
    return Condition.RAIN;
  }
  return ICONS[String(icon)] ?? Condition.CLOUDY;
};

/** Accumulation is inches or centimetres. Intensity is inches or millimetres per hour. */
const depth = (value: unknown, unit: string, from: 'cm-or-in' | 'mm-or-in') => {
  if (value == null || value === '') return Volume.native(null, unit);
  const n = Number(value);
  if (!Number.isFinite(n)) return Volume.native(null, unit);
  const measured = !imperial(unit) && from === 'cm-or-in' ? n * 10 : n;
  return Volume.native(measured, unit);
};

const pressureOf = (value: unknown) => {
  const n = Number(value);
  return { value: Number.isFinite(n) ? n : null, unit: PressureUnit.MB };
};

/** Pirate visibility is miles (`us`) or kilometres (`si`). */
const visibilityOf = (value: unknown, unit: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return { value: null, unit: imperial(unit) ? VisibilityUnit.MI : VisibilityUnit.M };
  }
  if (imperial(unit)) return { value: n, unit: VisibilityUnit.MI };
  return { value: n * 1000, unit: VisibilityUnit.M };
};

const windOrNull = (magnitude: unknown, direction: unknown, unit: string) =>
  magnitude == null || magnitude === '' ? null : new WindSpeed(num(magnitude), num(direction), unit);

/** Hourly rain is liquid accumulation. Intensity fills in when that field is absent. */
const hourRain = (row: Record<string, unknown>, unit: string) => {
  if (row.liquidAccumulation != null) return depth(row.liquidAccumulation, unit, 'cm-or-in');
  if (String(row.precipType) === 'snow') return depth(null, unit, 'mm-or-in');
  return depth(row.precipIntensity, unit, 'mm-or-in');
};

export default class PirateWeather extends Backend {
  #key: string;

  constructor(key = process.env.PIRATE_WEATHER_KEY || '') {
    super();
    this.#key = key;
  }

  /**
   * One Pirate Weather forecast URL.
   * https://docs.pirateweather.net/en/latest/API/
   * `us` matches imperial. `si` matches metric.
   */
  forecastUrl(options: BackendOptions) {
    const { lat, lon, unit = UnitSystem.METRIC, part = 'all' } = options;
    const key = options.key || this.#key;
    const params = new URLSearchParams({ units: imperial(unit) ? 'us' : 'si', version: '2' });
    if (part === 'current') params.set('exclude', 'minutely,hourly,alerts');
    else if (part === 'hourly') {
      params.set('exclude', 'currently,minutely,daily,alerts');
      params.set('extend', 'hourly');
    } else if (part === 'daily') params.set('exclude', 'currently,minutely,hourly,alerts');
    return `${ROOT}/${encodeURIComponent(key)}/${lat},${lon}?${params.toString()}`;
  }

  async fetch(res: Response, options: BackendOptions) {
    super.fetch(res, options);
    if (!options.lat || !options.lon) return null;
    return this.readForecast(this.forecastUrl(options));
  }

  serialize(data: Record<string, any>, unit: string, part: WeatherPart = 'all') {
    const mapped: Record<string, unknown> = {};
    if (part === 'all' || part === 'current') mapped.current = this.#mapCurrent(data, unit);
    if (part === 'all' || part === 'hourly') mapped.hourly = this.#mapHourly(data, unit);
    if (part === 'all' || part === 'daily') mapped.daily = this.#mapDaily(data, unit);
    return mapped;
  }

  #mapCurrent(data: Record<string, any>, unit: string) {
    const cur = block(data.currently);
    const firstDay = block(list(block(data.daily).data)[0]);
    return {
      apparentTemp: new Temperature(num(cur.apparentTemperature), unit),
      condition: conditionFor(cur.icon, cur.precipIntensity, unit),
      description: text(cur.summary),
      dewPoint: new Temperature(num(cur.dewPoint), unit),
      humidity: percent(cur.humidity),
      pressure: pressureOf(cur.pressure),
      sunrise: unixMillis(firstDay.sunriseTime),
      sunset: unixMillis(firstDay.sunsetTime),
      temp: new Temperature(num(cur.temperature), unit),
      time: unixMillis(cur.time),
      uvIndex: finite(cur.uvIndex),
      visibility: visibilityOf(cur.visibility, unit),
      windspeed: new WindSpeed(num(cur.windSpeed), num(cur.windBearing), unit),
    };
  }

  #mapHourly(data: Record<string, any>, unit: string) {
    return list(block(data.hourly).data)
      .slice(0, 168)
      .map((value) => {
        const hour = block(value);
        return {
          apparentTemp: new Temperature(num(hour.apparentTemperature), unit),
          cloudCover: percent(hour.cloudCover),
          condition: conditionFor(hour.icon, hour.precipIntensity, unit),
          description: text(hour.summary),
          dewPoint: new Temperature(num(hour.dewPoint), unit),
          humidity: percent(hour.humidity),
          precipProbability: percent(hour.precipProbability),
          precipVolume: depth(hour.precipIntensity, unit, 'mm-or-in'),
          pressure: pressureOf(hour.pressure),
          rainVolume: hourRain(hour, unit),
          snowVolume: depth(hour.snowAccumulation, unit, 'cm-or-in'),
          sunshineDuration: 0,
          temp: new Temperature(num(hour.temperature), unit),
          time: unixMillis(hour.time),
          uvIndex: Number.isFinite(Number(hour.uvIndex)) ? Number(hour.uvIndex) : 0,
          visibility: visibilityOf(hour.visibility, unit),
          windGust: windOrNull(hour.windGust, hour.windBearing, unit),
          windspeed: new WindSpeed(num(hour.windSpeed), num(hour.windBearing), unit),
        };
      });
  }

  #mapDaily(data: Record<string, any>, unit: string) {
    return list(block(data.daily).data)
      .slice(0, 7)
      .map((value) => {
        const day = block(value);
        const min = day.temperatureMin ?? day.temperatureLow;
        const max = day.temperatureMax ?? day.temperatureHigh;
        const feelsMin = day.apparentTemperatureMin ?? day.apparentTemperatureLow;
        const feelsMax = day.apparentTemperatureMax ?? day.apparentTemperatureHigh;
        return {
          apparentTemp: Temperature.range(num(feelsMin), num(feelsMax), unit),
          cloudCover: percent(day.cloudCover),
          condition: conditionFor(day.icon, day.precipIntensity, unit),
          description: text(day.summary),
          dewPoint: new Temperature(num(day.dewPoint), unit),
          humidity: percent(day.humidity),
          precipProbability: percent(day.precipProbability),
          pressure: pressureOf(day.pressure),
          rainVolume: depth(day.liquidAccumulation, unit, 'cm-or-in'),
          snowVolume: depth(day.snowAccumulation, unit, 'cm-or-in'),
          sunrise: unixMillis(day.sunriseTime),
          sunset: unixMillis(day.sunsetTime),
          temp: Temperature.range(num(min), num(max), unit),
          time: unixMillis(day.time),
          uvIndex: finite(day.uvIndex),
          windGust: windOrNull(day.windGust, day.windBearing, unit),
          windspeed: new WindSpeed(num(day.windSpeed), num(day.windBearing), unit),
        };
      });
  }
}
