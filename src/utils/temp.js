'use strict';

/**
 * Temperature class
 * @class {Object}
 * @property {number} value numeric value of temperature
 * @property {string} unit label for temperature
 */
module.exports = class Temperature {
  /**
   * Map the unit for a temperature from the system to the unit
   * @param {string} system what measurement system is used
   * @returns {string}
   */
  static system = (system) => {
    switch (system) {
      case 'IMPERIAL':
        return 'F';
      case 'METRIC':
        return 'C';
      default:
        return 'K';
    }
  };

  /**
   * Get the long system name for the provided unit
   * @param {string} system system name
   * @returns {string}
   */
  static longSystem = (system) => {
    switch (system) {
      case 'IMPERIAL':
        return 'fahrenheit';
      case 'METRIC':
      default:
        return 'celsius';
    }
  };

  /**
   * Temperature Range
   * @typedef {Object} TempRange
   * @property {Temperature} min
   * @property {Temperature} max
   */

  /**
   * Generate a temperature range
   * @param {string} min minimum temperature
   * @param {string} max maximum temperature
   * @param {string} unit temperature unit
   * @returns {TempRange}
   */
  static range = (min, max, unit) => {
    return {
      min: new Temperature(min, unit),
      max: new Temperature(max, unit),
    };
  };

  /**
   * Create temperature
   * @param {string|number} value numeric value of temperature as a number or string
   * @param {string} system unit to be mapped
   */
  constructor(value, system) {
    this.value = Number.parseFloat(value).toFixed(2);
    this.unit = Temperature.system(system);
  }
};
