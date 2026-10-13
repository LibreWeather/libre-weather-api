import { TempUnit, UnitSystem } from '../types';

export default class Temperature {
  value: string;
  unit: TempUnit;

  static mapUnit = (system: string) => {
    switch (system) {
      case UnitSystem.IMPERIAL:
        return TempUnit.F;
      case UnitSystem.METRIC:
        return TempUnit.C;
      default:
        return TempUnit.K;
    }
  };

  static longUnit = (system: string) => {
    switch (system) {
      case UnitSystem.IMPERIAL:
        return 'fahrenheit';
      case UnitSystem.METRIC:
      default:
        return 'celsius';
    }
  };

  static range = (min: string | number, max: string | number, unit: string) => ({
    min: new Temperature(min, unit),
    max: new Temperature(max, unit),
  });

  constructor(value: string | number, system: string) {
    this.value = Number.parseFloat(String(value)).toFixed(2);
    this.unit = Temperature.mapUnit(system);
  }
}
