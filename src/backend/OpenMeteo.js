'use strict';

const fetch = require('node-fetch');

const { volume: Volume, windspeed: WindSpeed, temp: Temperature } = require('../utils');

module.exports = class OpenMeteo extends require('./Backend') {
  #ROOT = 'https://api.open-meteo.com/v1';

  #PARAMS = [
    'current_weather=true',
    'hourly=temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,pressure_msl,weathercode,cloudcover',
    'daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode,precipitation_sum',
  ];

  /**
   * WMO Weather interpretation codes (WW)
   * Code       Description
   * 0          Clear sky
   * 1, 2, 3    Mainly clear, partly cloudy, and overcast
   * 45, 48     Fog and depositing rime fog
   * 51, 53, 55	Drizzle: Light, moderate, and dense intensity
   * 56, 57     Freezing Drizzle: Light and dense intensity
   * 61, 63, 65	Rain: Slight, moderate and heavy intensity
   * 66, 67     Freezing Rain: Light and heavy intensity
   * 71, 73, 75	Snow fall: Slight, moderate, and heavy intensity
   * 77	        Snow grains
   * 80, 81, 82	Rain showers: Slight, moderate, and violent
   * 85, 86	    Snow showers slight and heavy
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

    const mapped = {
      current: {
        apparentTemp: new Temperature(data.hourly.apparent_temperature?.[0], unit),
        condition: this.#WMO[data.current_weather.weathercode],
        dewPoint: new Temperature(data.hourly.dewpoint_2m?.[0], unit),
        humidity: Number.parseFloat(data.hourly.relativehumidity_2m?.[0], unit),
        pressure: { value: data.hourly.pressure_msl?.[0], unit: 'MB' },
        sunrise: new Date(data.daily.sunrise[0]).getTime() - tzOffset,
        sunset: new Date(data.daily.sunset[0]).getTime() - tzOffset,
        time: new Date(data.hourly.time[0]).getTime() - tzOffset,
        temp: new Temperature(data.current_weather.temperature, unit),
        visibility: { unit: '%', value: data.hourly?.cloudcover?.[0] },
        windspeed: new WindSpeed(data.current_weather.windspeed, data.current_weather.winddirection, unit),
      },
      hourly: [],
      daily: [],
    };

    for (let hour = 0; hour < 168; hour += 1) {
      mapped.hourly[hour] = {
        condition: this.#WMO[data.hourly.weathercode[hour]],
        temp: new Temperature(data.hourly.temperature_2m[hour], unit),
        time: new Date(data.hourly.time[hour]).getTime() - tzOffset,
      };
    }
    for (let day = 0; day < 7; day += 1) {
      const condition = this.#WMO[data.daily.weathercode[day]];
      mapped.daily[day] = {
        condition,
        description: '',
        rainVolume: new Volume(condition === 'RAIN' ? data.daily.precipitation_sum[day] : null, unit),
        snowVolume: new Volume(condition === 'SNOW' ? data.daily.precipitation_sum[day] : null, unit),
        sunrise: new Date(data.daily.sunrise[day]).getTime() - tzOffset,
        sunset: new Date(data.daily.sunset[day]).getTime() - tzOffset,
        temp: Temperature.range(data.daily.temperature_2m_min[day], data.daily.temperature_2m_max[day], unit),
        time: new Date(data.daily.time[day]).getTime() - tzOffset,
      };
    }
    return mapped;
  }
};
