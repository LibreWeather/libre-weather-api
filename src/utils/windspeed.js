'use strict';

/**
 * WindSpeed representation
 * @class
 * @property {number} magnitude
 * @property {string} direction
 * @property {string} unit
 */
module.exports = class WindSpeed {
  /**
   * Get the system units for given system
   * @param {string} system System name
   * @returns {string}
   */
  static mapUnit(system) {
    return system === 'IMPERIAL' ? 'MPH' : 'MS';
  }

  /**
   * Create a WindSpeed representation
   * @param {string|number} magnitude of the windspeed
   * @param {string} direction of the windspeed
   * @param {string} system of measure
   */
  constructor(magnitude, direction, system) {
    this.magnitude = Number.parseFloat(magnitude);
    this.direction = direction;
    this.unit = system === 'IMPERIAL' ? 'MPH' : 'MS';
  }
};
