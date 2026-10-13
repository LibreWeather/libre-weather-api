'use strict';

const { volume: Volume, windspeed: WindSpeed, temp: Temperature, visibility: Visibility } = require('../utils');

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
  unit: 'MB',
});

module.exports = class OpenMeteo extends require('./Backend') {
  #ROOT = 'https://api.open-meteo.com/v1';

  #PARAMS = ['current_weather=true', `hourly=${HOURLY_VARS}`, `daily=${DAILY_VARS}`];

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
  #WMO = {
    0: 'CLEAR',
    1: 'CLEAR',
    2: 'PARTLY_CLOUDY',
    3: 'CLOUDY',
    45: 'FOG',
    48: 'FOG',
    51: 'RAIN',
    53: 'RAIN',
    55: 'RAIN',
    56: 'SLEET',
    57: 'SLEET',
    61: 'RAIN',
    63: 'RAIN',
    65: 'RAIN',
    66: 'SLEET',
    67: 'SLEET',
    71: 'SNOW',
    73: 'SNOW',
    75: 'SNOW',
    77: 'SNOW',
    80: 'RAIN',
    81: 'RAIN',
    82: 'RAIN',
    85: 'SNOW',
    86: 'SNOW',
    95: 'RAIN',
    96: 'RAIN',
    99: 'RAIN',
  };

  #condition(code) {
    return this.#WMO[code];
  }

  #describe(code) {
    return WMO_TEXT[code] || '';
  }

  #visibility(value, unit) {
    if (value == null || value === '') {
      return { value: null, unit: unit === 'IMPERIAL' ? 'MI' : 'M' };
    }
    const n = Number.parseFloat(value);
    if (unit === 'IMPERIAL') {
      return { value: Number.parseFloat((n / 5280).toFixed(2)), unit: 'MI' };
    }
    return new Visibility(n, unit);
  }

  async fetch(res, options) {
    super.fetch(res, options);
    const { lat, lon, unit } = options;
    const unitParams = [
      `temperature_unit=${Temperature.longUnit(unit)}`,
      `windspeed_unit=${WindSpeed.mapUnit(unit).toLowerCase()}`,
      `precipitation_unit=${Volume.longUnit(unit).toLowerCase()}`,
      `timezone=${options.tz || process.env.TZ}`,
    ];
    const url = `${this.#ROOT}/forecast?latitude=${lat}&longitude=${lon}&${this.#PARAMS.join('&')}&${unitParams.join(
      '&'
    )}`;
    return fetch(url).then((weather) => weather.json());
  }

  serialize(data, unit) {
    const tzOffset = data.utc_offset_seconds * 1000;
    const hourlySrc = data.hourly || {};
    const dailySrc = data.daily || {};
    const mapped = {
      current: {
        apparentTemp: new Temperature(hourlySrc.apparent_temperature?.[0], unit),
        condition: this.#condition(data.current_weather.weathercode),
        description: this.#describe(data.current_weather.weathercode),
        dewPoint: new Temperature(hourlySrc.dewpoint_2m?.[0], unit),
        humidity: Number.parseFloat(hourlySrc.relativehumidity_2m?.[0], unit),
        pressure: pressureOf(hourlySrc.pressure_msl?.[0]),
        sunrise: new Date(dailySrc.sunrise[0]).getTime(),
        sunset: new Date(dailySrc.sunset[0]).getTime(),
        time: new Date(hourlySrc.time[0]).getTime() - tzOffset,
        temp: new Temperature(data.current_weather.temperature, unit),
        uvIndex: Number.parseFloat(hourlySrc.uv_index?.[0]),
        visibility: { unit: '%', value: hourlySrc.cloudcover?.[0] },
        windspeed: new WindSpeed(data.current_weather.windspeed, data.current_weather.winddirection, unit),
      },
      hourly: [],
      daily: [],
    };

    const now = Date.now();
    const times = hourlySrc.time || [];
    for (let hour = 0; hour < times.length && mapped.hourly.length < 168; hour += 1) {
      const time = new Date(times[hour]).getTime();
      if (time + 60 * 60 * 1000 <= now) continue;
      const code = at(hourlySrc.weathercode, hour);
      const windDir = at(hourlySrc.winddirection_10m, hour);
      const gust = at(hourlySrc.windgusts_10m, hour);
      mapped.hourly.push({
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

    const days = dailySrc.time || [];
    for (let day = 0; day < 7 && day < days.length; day += 1) {
      const code = at(dailySrc.weathercode, day);
      const windDir = at(dailySrc.winddirection_10m_dominant, day);
      const gust = at(dailySrc.windgusts_10m_max, day);
      mapped.daily[day] = {
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
    mapped.daily = mapped.daily.filter(Boolean);
    return mapped;
  }
};
