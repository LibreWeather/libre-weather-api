'use strict';

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
   * OWM rain/snow may be a mm number or `{ '1h': mm }`.
   * @param {number|{ '1h': number }|null|undefined} volume raw OWM volume
   * @returns {number|null}
   */
  static #volumeMm(volume) {
    if (volume == null) {
      return null;
    }
    if (typeof volume === 'object') {
      return volume['1h'] == null ? null : Number.parseFloat(volume['1h']);
    }
    return Number.parseFloat(volume);
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
        time: data.current.dt * 1000,
        uvIndex: Number.parseFloat(data.current.uvi),
        visibility: new Visibility(data.current.visibility, unit),
        windspeed: new WindSpeed(data.current.wind_speed, data.current.wind_deg, unit),
      },
      daily: [].concat(
        data.daily.map((day) => {
          const {
            clouds,
            dew_point: dewPoint,
            dt,
            feels_like: feelsLike,
            humidity,
            pop,
            pressure,
            rain,
            snow,
            sunrise,
            sunset,
            temp,
            uvi,
            weather,
            wind_deg: windDeg,
            wind_gust: windGust,
            wind_speed: windSpeed,
          } = day;
          const { max, min } = temp;
          const feels = [feelsLike?.morn, feelsLike?.day, feelsLike?.eve, feelsLike?.night]
            .map((v) => Number.parseFloat(v))
            .filter((v) => Number.isFinite(v));
          return {
            apparentTemp: feels.length
              ? Temperature.range(Math.min(...feels), Math.max(...feels), unit)
              : Temperature.range(min, max, unit),
            condition: OpenWeatherMap.#conditionCode(weather[0].id),
            description: capitalize(weather[0].description),
            daylightDuration: null,
            humidity: humidity == null ? null : Number.parseFloat(humidity),
            precipHours: null,
            precipProbability: pop == null ? null : Number.parseFloat(pop) * 100,
            pressure: { value: pressure, unit: 'MB' },
            rainVolume: new Volume(rain == null ? null : rain, unit),
            snowVolume: new Volume(snow == null ? null : snow, unit),
            sunrise,
            sunshineDuration: null,
            sunset,
            temp: Temperature.range(min, max, unit),
            time: dt * 1000,
            uvIndex: uvi == null ? null : Number.parseFloat(uvi),
            dewPoint: dewPoint == null ? null : new Temperature(dewPoint, unit),
            windGust: windGust == null ? null : new WindSpeed(windGust, windDeg, unit),
            windspeed: new WindSpeed(windSpeed, windDeg, unit),
            cloudCover: clouds == null ? null : Number.parseFloat(clouds),
          };
        })
      ),
      hourly: [].concat(
        data.hourly.map((hour) => {
          const rainMm = OpenWeatherMap.#volumeMm(hour.rain);
          const snowMm = OpenWeatherMap.#volumeMm(hour.snow);
          const precipMm = rainMm == null && snowMm == null ? 0 : (rainMm || 0) + (snowMm || 0);
          return {
            apparentTemp: new Temperature(hour.feels_like, unit),
            cloudCover: hour.clouds == null ? null : Number.parseFloat(hour.clouds),
            condition: OpenWeatherMap.#conditionCode(hour.weather[0].id),
            description: capitalize(hour.weather[0].description),
            dewPoint: new Temperature(hour.dew_point, unit),
            humidity: hour.humidity == null ? null : Number.parseFloat(hour.humidity),
            precipProbability: hour.pop == null ? null : Number.parseFloat(hour.pop) * 100,
            precipVolume: new Volume(precipMm, unit),
            pressure: { value: hour.pressure, unit: 'MB' },
            rainVolume: new Volume(rainMm, unit),
            snowVolume: new Volume(snowMm, unit),
            sunshineDuration: null,
            temp: new Temperature(hour.temp, unit),
            time: hour.dt * 1000,
            uvIndex: hour.uvi == null ? null : Number.parseFloat(hour.uvi),
            visibility: hour.visibility == null ? null : new Visibility(hour.visibility, unit),
            windGust: hour.wind_gust == null ? null : new WindSpeed(hour.wind_gust, hour.wind_deg, unit),
            windspeed: new WindSpeed(hour.wind_speed, hour.wind_deg, unit),
          };
        })
      ),
    };
  }
};
