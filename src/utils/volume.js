'use strict';

/**
 * Volume representation
 * @property {number} value magnitude of volume
 * @property {string} unit unit label of measure
 * @class
 */
module.exports = class Volume {
  /**
   * Map system to unit for volume measurements
   * @param {string} system system to look up units of volume for
   * @returns {string}
   */
  static mapUnit(system) {
    return system === 'IMPERIAL' ? 'IN' : 'MM';
  }

  /**
   * Map a system to the long form of the unit
   * @param {string} system system to map
   * @returns {string}
   */
  static longUnit(system) {
    return system === 'IMPERIAL' ? 'inch' : 'mm';
  }

  /**
   * Create a volume object with value and unit system
   * @param {string} value volume magnitude
   * @param {string} system system of measure
   */
  constructor(value, system) {
    if (value) {
      switch (system) {
        case 'IMPERIAL':
          // Convert from millimeters to inches
          this.value = Number.parseFloat(0.03937008 * value).toFixed(2);
          break;
        default:
          this.value = value;
      }
    } else {
      this.value = null;
    }

    this.unit = Volume.mapUnit(system);
  }
};
