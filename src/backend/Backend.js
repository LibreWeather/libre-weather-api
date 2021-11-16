'use strict';

/**
 * Map Options
 * @typedef {Object} BackendOptions
 * @property {string} lat latitude
 * @property {string} lon longitude
 * @property {string} unit unit system used for measures
 */

/**
 * Weather Condition
 * @typedef {'RAIN'|'SNOW'|'SLEET'|'FOG'|'WIND'|'CLEAR'|'PARTLY_CLOUDY'|'CLOUDY'} Condition
 */

/**
 * Measurement unit system
 * @typedef {'IMPERIAL'|'METRIC'|'FREEDOM_UNITS'|'DEFAULT'} Unit
 */

/**
 * Pressure Representation
 * @typedef {Object} Pressure
 * @property {number} value
 * @property {string} unit
 */

/**
 * Current weather description
 * @typedef {Object} Current
 * @property {Temperature} apparentTemp
 * @property {Condition} condition
 * @property {string} description
 * @property {Temperature} dewPoint
 * @property {number} humidity
 * @property {Pressure} pressure
 * @property {string} summary
 * @property {Date} sunrise
 * @property {Date} sunset
 * @property {Temperature} temp
 * @property {Date} time
 * @property {number} uvIndex
 * @property {Visibility} visibility
 * @property {WindSpeed} windspeed
 */

/**
 * Daily weather representation
 * @typedef {Object} Daily
 * @property {Condition} condition
 * @property {string} description
 * @property {Volume} rainVolume
 * @property {Volume} snowVolume
 * @property {Date} sunrise
 * @property {Date} sunset
 * @property {TempRange} temp
 * @property {Date} time
 */

/**
 * Hourly Weather Representation
 * @typedef {Object} Hourly
 * @property {Condition} condition
 * @property {Temperature} temp
 * @property {Date} time
 */

/**
 * LibreWeather Data Object
 * @typedef {Object} LibreWeatherData
 * @property {Current} current
 * @property {Array<Daily>} daily
 * @property {Array<Hourly>} hourly
 */

/**
 * Backend interface base API
 * @type {Backend}
 * @interface
 */
module.exports = class Backend {
  /**
   * Fetch data from this backend
   * @param {Express.Response} res Express response object to give access to return errors
   * @param {BackendOptions} options options object for requesting data
   * @returns {Promise<Object>}
   */
  // eslint-disable-next-line class-methods-use-this
  async fetch(res, options) {
    const { lat, lon } = options;

    if (!lat || !lon) {
      return res.json({
        error: 'Bad request, either latitude and longitude or weather location code are required.',
        code: 400,
      });
    }
    return null;
  }

  /**
   * Serialize backend data to common LibreWeather data representation
   * @param {Object} data raw backend data
   * @param {Unit} unit serialization unit of measure
   * @returns {LibreWeatherData}
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  serialize(data, unit) {}
};
