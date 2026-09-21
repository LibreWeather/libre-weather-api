import { UnitSystem, WindUnit } from '../types';

export default class WindSpeed {
  magnitude: number;
  direction: number | string;
  unit: WindUnit;

  static mapUnit(system: string) {
    return system === UnitSystem.IMPERIAL ? WindUnit.MPH : WindUnit.MS;
  }

  constructor(magnitude: string | number, direction: string | number, system: string) {
    this.magnitude = Number.parseFloat(String(magnitude));
    this.direction = direction;
    this.unit = system === UnitSystem.IMPERIAL ? WindUnit.MPH : WindUnit.MS;
  }
}
