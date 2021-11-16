'use strict';

const fetch = require('node-fetch');
const {
  capitalize,
  volume: Volume,
  visibility: Visibility,
  windspeed: WindSpeed,
  temp: Temperature,
} = require('../utils');

module.exports = class OpenWeatherMap extends require('./Backend') {
  /**
   * Open Weather root api url
   * @type {string} root url for OWM API Calls
   */
  #OPEN_WEATHER_ROOT = 'https://api.openweathermap.org/data/2.5/onecall';

  /**
   * App ID for fetching data
   * @type {string | undefined}
   */
  #APP_ID = process.env.OWM_KEY;

  /**
   * Map OWM Condition codes
   * @param {number} conditionCode condition code from OWM
   * @returns {string}
   */
  static #conditionCode(conditionCode) {
    if (conditionCode >= 200 && conditionCode < 600) {
      return 'RAIN';
    }
    if (conditionCode >= 600 && conditionCode < 611) {
      return 'SNOW';
    }
    if (conditionCode >= 611 && conditionCode < 700) {
      return 'SLEET';
    }
    if (conditionCode >= 701 && conditionCode < 771) {
      return 'FOG';
    }
    if (conditionCode >= 771 && conditionCode < 800) {
      return 'WIND';
    }
    if (conditionCode === 800) {
      return 'CLEAR';
    }
    if (conditionCode >= 801 && conditionCode < 803) {
      return 'PARTLY_CLOUDY';
    }
    if (conditionCode >= 803 && conditionCode < 900) {
      return 'CLOUDY';
    }
    return 'CLOUDY';
  }

  /**
   * Fetch data from Open Weather Maps
   * @param {Express.Response} res response
   * @param {BackendOptions} options weather map options
   */
  async fetch(res, options) {
    super.fetch(res, options);
    const { lat, lon, unit } = options;

    let data;
    if (lat && lon) {
      const url = `${this.#OPEN_WEATHER_ROOT}?lat=${lat}&lon=${lon}&appid=${this.#APP_ID}&units=${unit}`;
      data = await fetch(url).then((weather) => weather.json());
    }

    return data;
  }

  // eslint-disable-next-line class-methods-use-this
  serialize(data, unit) {
    return {
      current: {
        apparentTemp: new Temperature(data.current.feels_like, unit),
        condition: OpenWeatherMap.#conditionCode(data.current.weather[0].id),
        description: capitalize(data.current.weather[0].description),
        dewPoint: new Temperature(data.current.dew_point, unit),
        humidity: Number.parseFloat(data.current.humidity).toFixed(2),
        pressure: {
          value: data.current.pressure,
          unit: 'MB',
        },
        summary: data.current.weather[0].main,
        sunrise: data.current.sunrise,
        sunset: data.current.sunset,
        temp: new Temperature(data.current.temp, unit),
        time: data.current.dt,
        uvIndex: Number.parseFloat(data.current.uvi),
        visibility: new Visibility(data.current.visibility, unit),
        windspeed: new WindSpeed(data.current.wind_speed, data.current.wind_deg, unit),
      },
      daily: [].concat(
        data.daily.map(({ dt, rain, snow, sunrise, sunset, temp, weather }) => {
          const { max, min } = temp;
          return {
            condition: OpenWeatherMap.#conditionCode(weather[0].id),
            description: capitalize(weather[0].description),
            rainVolume: new Volume(rain == null ? null : rain, unit),
            snowVolume: new Volume(snow == null ? null : snow, unit),
            sunrise,
            sunset,
            temp: Temperature.range(min, max, unit),
            time: dt,
          };
        })
      ),
      hourly: [].concat(
        data.hourly.map(({ dt, temp, weather }) => ({
          condition: OpenWeatherMap.#conditionCode(weather[0].id),
          temp: new Temperature(temp, unit),
          time: dt,
        }))
      ),
    };
  }
};
