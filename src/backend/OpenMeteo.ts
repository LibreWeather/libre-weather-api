import { volume as Volume, windspeed as WindSpeed, temp as Temperature, visibility as Visibility } from '../utils';
import { Condition, PressureUnit, UnitSystem, VisibilityUnit } from '../types';
import Backend from './Backend';
import type { BackendOptions, WeatherPart } from './Backend';
import type { Response } from 'express';

const HOURLY_VARS = [
  'temperature_2m',
  'relativehumidity_2m',
  'dewpoint_2m',
  'apparent_temperature',
  'pressure_msl',
  'weathercode',
  'cloudcover',
  'precipitation',
  'precipitation_probability',
  'rain',
  'snowfall',
  'windspeed_10m',
  'winddirection_10m',
  'windgusts_10m',
  'uv_index',
  'visibility',
  'sunshine_duration',
].join(',');

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'sunrise',
  'sunset',
  'weathercode',
  'precipitation_sum',
  'precipitation_probability_max',
  'precipitation_hours',
  'rain_sum',
  'snowfall_sum',
  'windspeed_10m_max',
  'windgusts_10m_max',
  'winddirection_10m_dominant',
  'uv_index_max',
  'sunshine_duration',
  'daylight_duration',
].join(',');

const CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'dew_point_2m',
  'weather_code',
  'pressure_msl',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'uv_index',
].join(',');

const WMO_TEXT = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Freezing rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

const at = (series, index) => series?.[index];

const pressureOf = (value) => ({
  value: value == null ? null : Number.parseFloat(value),
  unit: PressureUnit.MB,
});

export default class OpenMeteo extends Backend {
  #ROOT = 'https://api.open-meteo.com/v1';

  /**
   * WMO Weather interpretation codes (WW)
   * Code       Description
   * 0          Clear sky
   * 1, 2, 3    Mainly clear, partly cloudy, and overcast
   * 45, 48     Fog and depositing rime fog
   * 51, 53, 55 Drizzle: Light, moderate, and dense intensity
   * 56, 57     Freezing Drizzle: Light and dense intensity
   * 61, 63, 65 Rain: Slight, moderate and heavy intensity
   * 66, 67     Freezing Rain: Light and heavy intensity
   * 71, 73, 75 Snow fall: Slight, moderate, and heavy intensity
   * 77         Snow grains
   * 80, 81, 82 Rain showers: Slight, moderate, and violent
   * 85, 86     Snow showers slight and heavy
   * 95         Thunderstorm: Slight or moderate
   * 96, 99     Thunderstorm with slight and heavy hail
   */
  #WMO: Record<number, Condition> = {
    0: Condition.CLEAR,
    1: Condition.CLEAR,
    2: Condition.PARTLY_CLOUDY,
    3: Condition.CLOUDY,
    45: Condition.FOG,
    48: Condition.FOG,
    51: Condition.RAIN,
    53: Condition.RAIN,
    55: Condition.RAIN,
    56: Condition.SLEET,
    57: Condition.SLEET,
    61: Condition.RAIN,
    63: Condition.RAIN,
    65: Condition.RAIN,
    66: Condition.SLEET,
    67: Condition.SLEET,
    71: Condition.SNOW,
    73: Condition.SNOW,
    75: Condition.SNOW,
    77: Condition.SNOW,
    80: Condition.RAIN,
    81: Condition.RAIN,
    82: Condition.RAIN,
    85: Condition.SNOW,
    86: Condition.SNOW,
    95: Condition.RAIN,
    96: Condition.RAIN,
    99: Condition.RAIN,
  };

  #condition(code) {
    return this.#WMO[code];
  }

  #describe(code) {
    return WMO_TEXT[code] || '';
  }

  #visibility(value, unit) {
    if (value == null || value === '') {
      return { value: null, unit: unit === UnitSystem.IMPERIAL ? VisibilityUnit.MI : VisibilityUnit.M };
    }
    const n = Number.parseFloat(value);
    if (unit === UnitSystem.IMPERIAL) {
      return { value: Number.parseFloat((n / 5280).toFixed(2)), unit: VisibilityUnit.MI };
    }
    return new Visibility(n, unit);
  }

  /**
   * Open-Meteo URL for one slice. `all` keeps the legacy combined request.
   * @param {BackendOptions} options
   * @returns {string}
   */
  forecastUrl(options: BackendOptions) {
    const { lat, lon, unit = UnitSystem.METRIC, tz, part = 'all' } = options;
    const query = [`latitude=${lat}`, `longitude=${lon}`];
    if (part === 'current') query.push(`current=${CURRENT_VARS}`, 'daily=sunrise,sunset', 'forecast_days=1');
    else if (part === 'hourly') query.push(`hourly=${HOURLY_VARS}`);
    else if (part === 'daily') query.push(`daily=${DAILY_VARS}`);
    else query.push('current_weather=true', `hourly=${HOURLY_VARS}`, `daily=${DAILY_VARS}`);
    query.push(
      `temperature_unit=${Temperature.longUnit(unit)}`,
      `windspeed_unit=${WindSpeed.mapUnit(unit).toLowerCase()}`,
      `precipitation_unit=${Volume.longUnit(unit).toLowerCase()}`,
      `timezone=${tz || process.env.TZ}`
    );
    return `${this.#ROOT}/forecast?${query.join('&')}`;
  }

  async fetch(res: Response, options: BackendOptions) {
    super.fetch(res, options);
    return fetch(this.forecastUrl(options)).then((weather) => weather.json());
  }

  #mapCurrent(data: Record<string, any>, unit: string, tzOffset: number) {
    const dailySrc = data.daily || {};
    const sunrise = new Date(at(dailySrc.sunrise, 0)).getTime();
    const sunset = new Date(at(dailySrc.sunset, 0)).getTime();
    if (!data.current_weather && data.current) {
      const cur = data.current;
      const code = cur.weather_code;
      return {
        apparentTemp: new Temperature(cur.apparent_temperature, unit),
        condition: this.#condition(code),
        description: this.#describe(code),
        dewPoint: new Temperature(cur.dew_point_2m, unit),
        humidity: Number.parseFloat(cur.relative_humidity_2m),
        pressure: pressureOf(cur.pressure_msl),
        sunrise,
        sunset,
        time: new Date(cur.time).getTime() - tzOffset,
        temp: new Temperature(cur.temperature_2m, unit),
        uvIndex: Number.parseFloat(cur.uv_index),
        visibility: { unit: VisibilityUnit.Percent, value: cur.cloud_cover },
        windspeed: new WindSpeed(cur.wind_speed_10m, cur.wind_direction_10m, unit),
      };
    }

    const hourlySrc = data.hourly || {};
    const times = hourlySrc.time || [];
    const now = Date.now();
    let cur = times.findLastIndex((t) => new Date(t).getTime() <= now);
    if (cur < 0) cur = 0;
    const code = data.current_weather.weathercode;
    return {
      apparentTemp: new Temperature(at(hourlySrc.apparent_temperature, cur), unit),
      condition: this.#condition(code),
      description: this.#describe(code),
      dewPoint: new Temperature(at(hourlySrc.dewpoint_2m, cur), unit),
      humidity: Number.parseFloat(at(hourlySrc.relativehumidity_2m, cur)),
      pressure: pressureOf(at(hourlySrc.pressure_msl, cur)),
      sunrise,
      sunset,
      time: new Date(times[cur]).getTime() - tzOffset,
      temp: new Temperature(data.current_weather.temperature, unit),
      uvIndex: Number.parseFloat(at(hourlySrc.uv_index, cur)),
      visibility: { unit: VisibilityUnit.Percent, value: at(hourlySrc.cloudcover, cur) },
      windspeed: new WindSpeed(data.current_weather.windspeed, data.current_weather.winddirection, unit),
    };
  }

  #mapHourly(data: Record<string, any>, unit: string) {
    const hourlySrc = data.hourly || {};
    const times = hourlySrc.time || [];
    const hourly: any[] = [];
    for (let hour = 0; hour < times.length && hourly.length < 168; hour += 1) {
      const time = new Date(times[hour]).getTime();
      const code = at(hourlySrc.weathercode, hour);
      const windDir = at(hourlySrc.winddirection_10m, hour);
      const gust = at(hourlySrc.windgusts_10m, hour);
      hourly.push({
        apparentTemp: new Temperature(at(hourlySrc.apparent_temperature, hour), unit),
        cloudCover: Number.parseFloat(at(hourlySrc.cloudcover, hour)),
        condition: this.#condition(code),
        description: this.#describe(code),
        dewPoint: new Temperature(at(hourlySrc.dewpoint_2m, hour), unit),
        humidity: Number.parseFloat(at(hourlySrc.relativehumidity_2m, hour)),
        precipProbability: Number.parseFloat(at(hourlySrc.precipitation_probability, hour)),
        precipVolume: Volume.native(at(hourlySrc.precipitation, hour), unit),
        pressure: pressureOf(at(hourlySrc.pressure_msl, hour)),
        rainVolume: Volume.native(at(hourlySrc.rain, hour), unit),
        snowVolume: Volume.native(at(hourlySrc.snowfall, hour), unit),
        sunshineDuration: Number.parseFloat(at(hourlySrc.sunshine_duration, hour)),
        temp: new Temperature(at(hourlySrc.temperature_2m, hour), unit),
        time,
        uvIndex: Number.parseFloat(at(hourlySrc.uv_index, hour)),
        visibility: this.#visibility(at(hourlySrc.visibility, hour), unit),
        windGust: gust == null ? null : new WindSpeed(gust, windDir, unit),
        windspeed: new WindSpeed(at(hourlySrc.windspeed_10m, hour), windDir, unit),
      });
    }
    return hourly;
  }

  #mapDaily(data: Record<string, any>, unit: string, tzOffset: number) {
    const dailySrc = data.daily || {};
    const days = dailySrc.time || [];
    const daily: any[] = [];
    for (let day = 0; day < 7 && day < days.length; day += 1) {
      const code = at(dailySrc.weathercode, day);
      const windDir = at(dailySrc.winddirection_10m_dominant, day);
      const gust = at(dailySrc.windgusts_10m_max, day);
      daily[day] = {
        apparentTemp: Temperature.range(
          at(dailySrc.apparent_temperature_min, day),
          at(dailySrc.apparent_temperature_max, day),
          unit
        ),
        condition: this.#condition(code),
        description: this.#describe(code),
        daylightDuration: Number.parseFloat(at(dailySrc.daylight_duration, day)),
        precipHours: Number.parseFloat(at(dailySrc.precipitation_hours, day)),
        precipProbability: Number.parseFloat(at(dailySrc.precipitation_probability_max, day)),
        rainVolume: Volume.native(at(dailySrc.rain_sum, day), unit),
        snowVolume: Volume.native(at(dailySrc.snowfall_sum, day), unit),
        sunrise: new Date(at(dailySrc.sunrise, day)).getTime() - tzOffset,
        sunshineDuration: Number.parseFloat(at(dailySrc.sunshine_duration, day)),
        sunset: new Date(at(dailySrc.sunset, day)).getTime() - tzOffset,
        temp: Temperature.range(at(dailySrc.temperature_2m_min, day), at(dailySrc.temperature_2m_max, day), unit),
        time: new Date(at(dailySrc.time, day)).getTime() - tzOffset,
        uvIndex: Number.parseFloat(at(dailySrc.uv_index_max, day)),
        windGust: gust == null ? null : new WindSpeed(gust, windDir, unit),
        windspeed: new WindSpeed(at(dailySrc.windspeed_10m_max, day), windDir, unit),
      };
    }
    return daily.filter(Boolean);
  }

  serialize(data: Record<string, any>, unit: string, part: WeatherPart = 'all'): any {
    const tzOffset = data.utc_offset_seconds * 1000;
    const mapped: Record<string, unknown> = {};
    if (part === 'all' || part === 'current') mapped.current = this.#mapCurrent(data, unit, tzOffset);
    if (part === 'all' || part === 'hourly') mapped.hourly = this.#mapHourly(data, unit);
    if (part === 'all' || part === 'daily') mapped.daily = this.#mapDaily(data, unit, tzOffset);
    return mapped;
  }
};
