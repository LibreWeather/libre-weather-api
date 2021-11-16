'use strict';

/**
 * Object for transporting visibility data
 */
module.exports = class Visibility {
  /**
   * Map system to a unit
   * @param {string} system system to map to a unit
   * @returns {string}
   */
  static mapUnit(system) {
    return system === 'IMPERIAL' ? 'MI' : 'M';
  }

  /**
   * Create the visibility object
   * @param {string|number} value visibility magnitude
   * @param {string} system visibility label
   */
  constructor(value, system) {
    const massaged = Number.parseFloat(value).toFixed(2);
    switch (system) {
      case 'IMPERIAL':
        // Convert from meters to miles
        this.value = Number.parseFloat(0.00062137119223733 * massaged).toFixed(2);
        break;
      default:
        this.value = value;
    }
    this.unit = Visibility.mapUnit(system);
  }
};
